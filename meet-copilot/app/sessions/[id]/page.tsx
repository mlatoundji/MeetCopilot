import React from 'react';
import MainContent from '../../../components/MainContent';

interface SessionPageProps {
  params: { id: string };
}

export default function SessionPage({ params }: SessionPageProps) {
  const { id } = params;

  return (
    <MainContent>
      <h1>Session {id}</h1>
      <p>Details for session {id}</p>
    </MainContent>
  );
} 