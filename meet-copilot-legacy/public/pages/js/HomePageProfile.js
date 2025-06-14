export default class HomePageProfile {
  constructor(app) {
    this.app = app;
    this.apiHandler = app.apiHandler;
  }

  async init() {
    this.setupEventListeners();
    await this.loadProfile();
  }

  render() {
    // No-op since HTML is static
  }

  async loadProfile() {
    try {
      const url = `${this.apiHandler.baseURL}/api/profile`;
      const profile = await this.apiHandler.callApi(url, { method: 'GET' });
      document.getElementById('avatarUrl').value = profile.avatar_url || '';
      document.getElementById('bio').value = profile.bio || '';
      document.getElementById('metadata').value = JSON.stringify(profile.metadata || {}, null, 2);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }

  setupEventListeners() {
    const saveButton = document.getElementById('saveProfileButton');
    if (saveButton) {
      saveButton.addEventListener('click', async () => {
        const avatar_url = document.getElementById('avatarUrl').value;
        const bio = document.getElementById('bio').value;
        let metadata;
        try {
          metadata = JSON.parse(document.getElementById('metadata').value);
        } catch (e) {
          alert('Invalid JSON for metadata');
          return;
        }
        try {
          const url = `${this.apiHandler.baseURL}/api/profile`;
          await this.apiHandler.callApi(url, {
            method: 'PATCH',
            body: JSON.stringify({ avatar_url, bio, metadata })
          });
          alert('Profile updated successfully');
        } catch (error) {
          console.error('Error saving profile:', error);
          alert('Failed to save profile');
        }
      });
    }
  }
} 