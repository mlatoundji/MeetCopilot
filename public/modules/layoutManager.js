/**
 * Gère l'agencement de la page de réunion, incluant la sidebar rétractable,
 * les zones de contenu redimensionnables et déplaçables, et les préréglages d'agencement.
 */
export class LayoutManager {
  constructor() {
    this.initialized = false;
    this.meetingSidebar = null;
    this.toggleSidebarBtn = null;
    this.meetingContentGrid = null;
    this.contentAreas = [];
    this.toggleLayoutPresetsBtn = null;
    this.layoutPresetsPanel = null;
    this.presetButtonList = null;
    this.saveCurrentLayoutBtn = null;
    
    // État de la mise en page
    this.currentLayout = 'standard';
    this.savedLayouts = {};
    this.draggingElement = null;
    this.resizingElement = null;
    this.pointerStartX = 0;
    this.pointerStartY = 0;
    this.elementStartX = 0;
    this.elementStartY = 0;
    this.elementStartWidth = 0;
    this.elementStartHeight = 0;
  }
  
  /**
   * Initialise le gestionnaire de mise en page
   */
  initialize() {
    if (this.initialized) return;
    
    // Récupérer les références aux éléments DOM
    this.meetingSidebar = document.getElementById('meetingSidebar');
    this.toggleSidebarBtn = document.getElementById('toggleSidebar');
    this.meetingContentGrid = document.getElementById('meetingContentGrid');
    this.contentAreas = Array.from(document.querySelectorAll('.content-area'));
    this.toggleLayoutPresetsBtn = document.getElementById('toggleLayoutPresets');
    this.layoutPresetsPanel = document.getElementById('layoutPresetsPanel');
    this.presetButtonList = Array.from(document.querySelectorAll('.preset-btn'));
    this.saveCurrentLayoutBtn = document.getElementById('saveCurrentLayout');
    
    // Vérifier que tous les éléments requis sont présents
    if (!this.meetingSidebar || !this.toggleSidebarBtn || !this.meetingContentGrid) {
      console.error('Certains éléments requis sont manquants dans le DOM');
      return;
    }
    
    this.setupEventListeners();
    this.loadLayoutsFromLocalStorage();
    this.initialized = true;
    console.log('LayoutManager initialized');
  }
  
  /**
   * Configure les écouteurs d'événements
   */
  setupEventListeners() {
    // Sidebar toggle
    this.toggleSidebarBtn.addEventListener('click', () => this.toggleSidebar());
    
    // Layout presets toggle
    if (this.toggleLayoutPresetsBtn && this.layoutPresetsPanel) {
      this.toggleLayoutPresetsBtn.addEventListener('click', () => this.toggleLayoutPresets());
      
      // Fermer le panneau quand on clique ailleurs
      document.addEventListener('click', (e) => {
        if (this.layoutPresetsPanel.classList.contains('active') && 
            !this.layoutPresetsPanel.contains(e.target) && 
            e.target !== this.toggleLayoutPresetsBtn) {
          this.layoutPresetsPanel.classList.remove('active');
        }
      });
    }
    
    // Preset buttons
    const buttons = this.getPresetButtons();
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = btn.getAttribute('data-preset');
        this.applyLayoutPreset(preset);
        this.updatePresetButtonStates(preset);
      });
    });
    
    // Save layout button
    if (this.saveCurrentLayoutBtn) {
      this.saveCurrentLayoutBtn.addEventListener('click', () => this.saveCurrentLayout());
    }
    
    // Configuration des contrôles pour chaque zone de contenu
    this.setupContentAreaControls();
  }
  
  /**
   * Configure les contrôles pour redimensionner et déplacer les zones de contenu
   */
  setupContentAreaControls() {
    // Cleanup existing listeners if any
    this.cleanupEventListeners();
    
    // Use event delegation for content area controls
    document.addEventListener('mousedown', (e) => {
      const moveHandle = e.target.closest('.move-handle');
      const resizeHandle = e.target.closest('.resize-handle');
      const fullscreenToggle = e.target.closest('.fullscreen-toggle');
      const opacityToggle = e.target.closest('.opacity-toggle');
      const hideToggle = e.target.closest('.hide-toggle');
      
      if (moveHandle) {
        const area = moveHandle.closest('.content-area');
        if (area) this.startDragging(e, area);
      } else if (resizeHandle) {
        const area = resizeHandle.closest('.content-area');
        if (area) this.startResizing(e, area);
      } else if (fullscreenToggle) {
        const area = fullscreenToggle.closest('.content-area');
        if (area) this.toggleFullscreen(area);
      } else if (opacityToggle) {
        const area = opacityToggle.closest('.content-area');
        if (area) this.toggleOpacity(area);
      } else if (hideToggle) {
        const area = hideToggle.closest('.content-area');
        if (area) this.toggleVisibility(area);
      }
    });
    
    // Écouteurs globaux pour le déplacement et le redimensionnement
    this.globalMoveHandler = (e) => this.onPointerMove(e);
    this.globalTouchHandler = (e) => this.onPointerMove(e);
    this.globalUpHandler = () => this.stopDraggingOrResizing();
    
    document.addEventListener('mousemove', this.globalMoveHandler);
    document.addEventListener('touchmove', this.globalTouchHandler, { passive: false });
    document.addEventListener('mouseup', this.globalUpHandler);
    document.addEventListener('touchend', this.globalUpHandler);
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', this.globalUpHandler);
  }
  
  /**
   * Nettoie les écouteurs d'événements globaux
   */
  cleanupEventListeners() {
    if (this.globalMoveHandler) {
      document.removeEventListener('mousemove', this.globalMoveHandler);
      document.removeEventListener('touchmove', this.globalTouchHandler, { passive: false });
      document.removeEventListener('mouseup', this.globalUpHandler);
      document.removeEventListener('touchend', this.globalUpHandler);
      window.removeEventListener('beforeunload', this.globalUpHandler);
    }
  }
  
  /**
   * Bascule la sidebar entre l'état étendu et rétracté
   */
  toggleSidebar() {
    this.meetingSidebar.classList.toggle('collapsed');
    // Ajuster la grille de contenu en fonction de l'état de la sidebar
    this.adjustContentGrid();
  }
  
  /**
   * Ajuste la grille de contenu en fonction de l'état de la sidebar
   */
  adjustContentGrid() {
    // Si la sidebar est rétractée, élargir la grille de contenu
    if (this.meetingSidebar.classList.contains('collapsed')) {
      this.meetingContentGrid.style.marginLeft = '0';
    } else {
      this.meetingContentGrid.style.marginLeft = '';
    }
  }
  
  /**
   * Bascule l'affichage du panneau de préréglages
   */
  toggleLayoutPresets() {
    this.layoutPresetsPanel.classList.toggle('active');
  }
  
  /**
   * Applique un préréglage d'agencement
   * @param {string} preset - Nom du préréglage à appliquer
   */
  applyLayoutPreset(preset) {
    this.currentLayout = preset;
    
    // Reset grid template styles to default
    this.meetingContentGrid.style.gridTemplateColumns = '';
    this.meetingContentGrid.style.gridTemplateRows = '';
    
    // Réinitialiser les styles personnalisés
    this.contentAreas.forEach(area => {
      area.style.gridColumn = '';
      area.style.gridRow = '';
      area.style.zIndex = '';
      area.style.opacity = '';
      area.classList.remove('hidden', 'fullscreen');
    });
    
    // Appliquer le préréglage
    switch (preset) {
      case 'standard':
        // Disposition par défaut (déjà définie en CSS)
        break;
        
      case 'focusVideo':
        // Mettre l'accent sur la vidéo
        const videoArea = document.getElementById('screenCaptureArea');
        if (videoArea) {
          videoArea.style.gridColumn = '1 / span 2';
          videoArea.style.gridRow = '1 / span 2';
          
          const suggestionsArea = document.getElementById('suggestionsArea');
          const transcriptionArea = document.getElementById('transcriptionArea');
          
          if (suggestionsArea) {
            suggestionsArea.style.gridColumn = '1';
            suggestionsArea.style.gridRow = '3';
          }
          
          if (transcriptionArea) {
            transcriptionArea.style.gridColumn = '2';
            transcriptionArea.style.gridRow = '3';
          }
        }
        break;
        
      case 'focusTranscription':
        // Mettre l'accent sur la transcription
        const transcriptionArea = document.getElementById('transcriptionArea');
        if (transcriptionArea) {
          transcriptionArea.style.gridColumn = '1 / span 2';
          transcriptionArea.style.gridRow = '1 / span 2';
          
          const videoArea = document.getElementById('screenCaptureArea');
          const suggestionsArea = document.getElementById('suggestionsArea');
          
          if (videoArea) {
            videoArea.style.gridColumn = '1';
            videoArea.style.gridRow = '3';
          }
          
          if (suggestionsArea) {
            suggestionsArea.style.gridColumn = '2';
            suggestionsArea.style.gridRow = '3';
          }
        }
        break;
        
      case 'compact':
        // Disposition compacte avec toutes les zones visibles mais plus petites
        this.meetingContentGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';
        this.meetingContentGrid.style.gridTemplateRows = 'repeat(2, 1fr)';
        
        const compactVideoArea = document.getElementById('screenCaptureArea');
        const compactSuggestionsArea = document.getElementById('suggestionsArea');
        const compactTranscriptionArea = document.getElementById('transcriptionArea');
        
        if (compactVideoArea) {
          compactVideoArea.style.gridColumn = '1 / span 2';
          compactVideoArea.style.gridRow = '1';
        }
        
        if (compactSuggestionsArea) {
          compactSuggestionsArea.style.gridColumn = '3';
          compactSuggestionsArea.style.gridRow = '1';
        }
        
        if (compactTranscriptionArea) {
          compactTranscriptionArea.style.gridColumn = '1 / span 3';
          compactTranscriptionArea.style.gridRow = '2';
        }
        break;
        
      case 'overlay':
        // Superposition des zones
        const overlayVideoArea = document.getElementById('screenCaptureArea');
        const overlaySuggestionsArea = document.getElementById('suggestionsArea');
        const overlayTranscriptionArea = document.getElementById('transcriptionArea');
        
        if (overlayVideoArea && overlaySuggestionsArea && overlayTranscriptionArea) {
          // Vidéo en arrière-plan sur toute la grille
          overlayVideoArea.style.gridColumn = '1 / span 2';
          overlayVideoArea.style.gridRow = '1 / span 2';
          overlayVideoArea.style.zIndex = '1';
          
          // Suggestions et transcription superposées avec opacité
          overlaySuggestionsArea.style.gridColumn = '1';
          overlaySuggestionsArea.style.gridRow = '1';
          overlaySuggestionsArea.style.zIndex = '2';
          overlaySuggestionsArea.style.opacity = '0.8';
          
          overlayTranscriptionArea.style.gridColumn = '2';
          overlayTranscriptionArea.style.gridRow = '1 / span 2';
          overlayTranscriptionArea.style.zIndex = '2';
          overlayTranscriptionArea.style.opacity = '0.8';
        }
        break;
        
      default:
        // Si c'est un préréglage sauvegardé
        if (this.savedLayouts[preset]) {
          this.applySavedLayout(preset);
        }
    }
    
    console.log(`Applied layout preset: ${preset}`);
  }
  
  /**
   * Sauvegarde l'agencement actuel
   */
  saveCurrentLayout() {
    const layoutName = prompt('Donnez un nom à cet agencement:', 'Mon agencement');
    if (!layoutName) return;
    
    // Capturer l'état actuel de chaque zone
    const layoutState = {};
    this.contentAreas.forEach(area => {
      const id = area.id;
      layoutState[id] = {
        gridColumn: area.style.gridColumn,
        gridRow: area.style.gridRow,
        zIndex: area.style.zIndex,
        opacity: area.style.opacity,
        hidden: area.classList.contains('hidden'),
        fullscreen: area.classList.contains('fullscreen')
      };
    });
    
    this.savedLayouts[layoutName] = layoutState;
    this.saveLayoutToLocalStorage();
    this.addSavedLayoutPreset(layoutName);
    
    console.log(`Layout saved: ${layoutName}`);
  }
  
  /**
   * Applique un agencement sauvegardé
   * @param {string} layoutName - Nom de l'agencement à appliquer
   */
  applySavedLayout(layoutName) {
    const layout = this.savedLayouts[layoutName];
    if (!layout) return;
    
    // Appliquer les propriétés sauvegardées à chaque zone
    Object.keys(layout).forEach(areaId => {
      const area = document.getElementById(areaId);
      if (!area) return;
      
      const state = layout[areaId];
      area.style.gridColumn = state.gridColumn || '';
      area.style.gridRow = state.gridRow || '';
      area.style.zIndex = state.zIndex || '';
      area.style.opacity = state.opacity || '';
      
      if (state.hidden) {
        area.classList.add('hidden');
      } else {
        area.classList.remove('hidden');
      }
      
      if (state.fullscreen) {
        area.classList.add('fullscreen');
      } else {
        area.classList.remove('fullscreen');
      }
    });
    
    console.log(`Applied saved layout: ${layoutName}`);
  }
  
  /**
   * Démarre le déplacement d'une zone
   * @param {Event} e - Événement de souris ou tactile
   * @param {HTMLElement} element - Élément à déplacer
   */
  startDragging(e, element) {
    e.preventDefault();
    this.draggingElement = element;
    element.classList.add('dragging');
    
    const pointerEvent = e.touches ? e.touches[0] : e;
    this.pointerStartX = pointerEvent.clientX;
    this.pointerStartY = pointerEvent.clientY;
    
    // Capturer la position initiale
    const rect = element.getBoundingClientRect();
    this.elementStartX = rect.left;
    this.elementStartY = rect.top;
    
    console.log('Started dragging', element.id);
  }
  
  /**
   * Démarre le redimensionnement d'une zone
   * @param {Event} e - Événement de souris ou tactile
   * @param {HTMLElement} element - Élément à redimensionner
   */
  startResizing(e, element) {
    e.preventDefault();
    this.resizingElement = element;
    element.classList.add('resizing');
    
    const pointerEvent = e.touches ? e.touches[0] : e;
    this.pointerStartX = pointerEvent.clientX;
    this.pointerStartY = pointerEvent.clientY;
    
    // Capturer les dimensions initiales
    const rect = element.getBoundingClientRect();
    this.elementStartWidth = rect.width;
    this.elementStartHeight = rect.height;
    
    console.log('Started resizing', element.id);
  }
  
  /**
   * Gère le déplacement de la souris ou du toucher pendant le déplacement ou le redimensionnement
   * @param {Event} e - Événement de souris ou tactile
   */
  onPointerMove(e) {
    if (!this.draggingElement && !this.resizingElement) return;
    
    const pointerEvent = e.touches ? e.touches[0] : e;
    const dx = pointerEvent.clientX - this.pointerStartX;
    const dy = pointerEvent.clientY - this.pointerStartY;
    
    if (this.draggingElement) {
      e.preventDefault();
      // Logique de déplacement
      this.updateElementPosition(dx, dy);
    } else if (this.resizingElement) {
      e.preventDefault();
      // Logique de redimensionnement
      this.updateElementSize(dx, dy);
    }
  }
  
  /**
   * Expands repeat() syntax in grid template strings
   * @param {string} template - The grid template string
   * @returns {string} - The expanded template string
   */
  expandGridTemplate(template) {
    return template.replace(/repeat\((\d+),\s*([^)]+)\)/g, (match, count, value) => {
      return Array(parseInt(count)).fill(value.trim()).join(' ');
    });
  }

  /**
   * Gets the number of tracks in a grid template
   * @param {string} template - The grid template string
   * @returns {number} - The number of tracks
   */
  getGridTrackCount(template) {
    const expandedTemplate = this.expandGridTemplate(template);
    return expandedTemplate.split(/\s+/).filter(track => track.trim()).length;
  }

  /**
   * Met à jour la position d'un élément pendant le déplacement
   * @param {number} dx - Différence en X
   * @param {number} dy - Différence en Y
   */
  updateElementPosition(dx, dy) {
    // Calculer les nouvelles cellules de la grille en fonction de la position
    const gridRect = this.meetingContentGrid.getBoundingClientRect();
    const element = this.draggingElement;
    const elementRect = element.getBoundingClientRect();
    
    // Calculer la position centrale de l'élément
    const centerX = this.elementStartX + dx + elementRect.width / 2;
    const centerY = this.elementStartY + dy + elementRect.height / 2;
    
    // Déterminer dans quelle cellule de la grille se trouve le centre
    const relativeX = centerX - gridRect.left;
    const relativeY = centerY - gridRect.top;
    
    // Obtenir le nombre total de colonnes et de lignes
    const computedStyle = window.getComputedStyle(this.meetingContentGrid);
    const gridTemplateColumns = computedStyle.getPropertyValue('grid-template-columns');
    const gridTemplateRows = computedStyle.getPropertyValue('grid-template-rows');
    
    const columnCount = this.getGridTrackCount(gridTemplateColumns);
    const rowCount = this.getGridTrackCount(gridTemplateRows);
    
    // Calculer la taille d'une cellule
    const cellWidth = gridRect.width / columnCount;
    const cellHeight = gridRect.height / rowCount;
    
    // Déterminer la colonne et la ligne
    const column = Math.floor(relativeX / cellWidth) + 1;
    const row = Math.floor(relativeY / cellHeight) + 1;
    
    // Limiter aux limites de la grille
    const newColumn = Math.max(1, Math.min(column, columnCount));
    const newRow = Math.max(1, Math.min(row, rowCount));
    
    // Mettre à jour la position de l'élément dans la grille
    element.style.gridColumn = `${newColumn}`;
    element.style.gridRow = `${newRow}`;
  }
  
  /**
   * Met à jour la taille d'un élément pendant le redimensionnement
   * @param {number} dx - Différence en X
   * @param {number} dy - Différence en Y
   */
  updateElementSize(dx, dy) {
    const element = this.resizingElement;
    
    // Calculate new dimensions based on resize delta
    const newWidth = this.elementStartWidth + dx;
    const newHeight = this.elementStartHeight + dy;
    
    // Update grid-column-end and grid-row-end properties
    const gridRect = this.meetingContentGrid.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    
    // Calculate the number of columns and rows to span
    const columnCount = Math.ceil(newWidth / (gridRect.width / this.getGridTrackCount(window.getComputedStyle(this.meetingContentGrid).getPropertyValue('grid-template-columns'))));
    const rowCount = Math.ceil(newHeight / (gridRect.height / this.getGridTrackCount(window.getComputedStyle(this.meetingContentGrid).getPropertyValue('grid-template-rows'))));
    
    // Update the element's grid properties
    element.style.gridColumnEnd = `span ${columnCount}`;
    element.style.gridRowEnd = `span ${rowCount}`;
  }
  
  /**
   * Arrête le déplacement ou le redimensionnement
   */
  stopDraggingOrResizing() {
    if (this.draggingElement) {
      this.draggingElement.classList.remove('dragging');
      this.draggingElement = null;
    }
    
    if (this.resizingElement) {
      this.resizingElement.classList.remove('resizing');
      this.resizingElement = null;
    }
  }
  
  /**
   * Bascule une zone en plein écran
   * @param {HTMLElement} element - Élément à basculer en plein écran
   */
  toggleFullscreen(element) {
    element.classList.toggle('fullscreen');
  }
  
  /**
   * Bascule l'opacité d'une zone
   * @param {HTMLElement} element - Élément dont l'opacité doit être ajustée
   */
  toggleOpacity(element) {
    const currentOpacity = parseFloat(element.style.opacity) || 1;
    const opacityValues = [1, 0.8, 0.6, 0.4];
    
    // Trouver la prochaine valeur d'opacité
    let nextOpacityIndex = opacityValues.indexOf(currentOpacity) + 1;
    if (nextOpacityIndex >= opacityValues.length) nextOpacityIndex = 0;
    
    element.style.opacity = opacityValues[nextOpacityIndex];
  }
  
  /**
   * Bascule la visibilité d'une zone
   * @param {HTMLElement} element - Élément à masquer ou afficher
   */
  toggleVisibility(element) {
    element.classList.toggle('hidden');
  }
  
  /**
   * Gets the current list of preset buttons from the DOM
   * @returns {Array<HTMLElement>} Array of preset button elements
   */
  getPresetButtons() {
    return Array.from(document.querySelectorAll('.preset-btn'));
  }

  /**
   * Updates the active state of preset buttons
   * @param {string} activePreset - The name of the active preset
   */
  updatePresetButtonStates(activePreset) {
    const buttons = this.getPresetButtons();
    buttons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-preset') === activePreset);
    });
  }
  
  /**
   * Ajoute un préréglage d'agencement sauvegardé à l'interface
   * @param {string} layoutName - Nom de l'agencement sauvegardé
   */
  addSavedLayoutPreset(layoutName) {
    if (!this.layoutPresetsPanel) return;
    
    // Vérifier si un bouton pour cet agencement existe déjà
    const existingButton = this.getPresetButtons().find(btn => 
      btn.getAttribute('data-preset') === layoutName
    );
    
    if (existingButton) return;
    
    // Créer un nouveau bouton
    const presetButton = document.createElement('button');
    presetButton.className = 'preset-btn';
    presetButton.setAttribute('data-preset', layoutName);
    presetButton.textContent = layoutName;
    
    presetButton.addEventListener('click', () => {
      this.applyLayoutPreset(layoutName);
      this.updatePresetButtonStates(layoutName);
    });
    
    // Ajouter à la liste des boutons de préréglage
    const presetButtonsContainer = this.layoutPresetsPanel.querySelector('.preset-buttons');
    if (presetButtonsContainer) {
      presetButtonsContainer.appendChild(presetButton);
    }
  }
  
  /**
   * Sauvegarde les agencements dans le stockage local
   */
  saveLayoutToLocalStorage() {
    try {
      localStorage.setItem('savedLayouts', JSON.stringify(this.savedLayouts));
    } catch (error) {
      console.error('Error saving layouts to localStorage:', error);
    }
  }
  
  /**
   * Charge les agencements depuis le stockage local
   */
  loadLayoutsFromLocalStorage() {
    try {
      const savedLayouts = localStorage.getItem('savedLayouts');
      if (savedLayouts) {
        this.savedLayouts = JSON.parse(savedLayouts);
        
        // Ajouter les boutons pour les agencements sauvegardés
        Object.keys(this.savedLayouts).forEach(layoutName => {
          this.addSavedLayoutPreset(layoutName);
        });
      }
    } catch (error) {
      console.error('Error loading layouts from localStorage:', error);
    }
  }
} 