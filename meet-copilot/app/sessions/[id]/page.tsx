import React from 'react';
import type { PageProps } from 'next';
import MainContent from '../../../components/MainContent';

export default function SessionPage({ params }: PageProps<{ id: string }>) {
  const { id } = params;

  return (
    <MainContent>
      <h1>Session {id}</h1>
      <p>Details for session {id}</p>
    </MainContent>
  );
} 