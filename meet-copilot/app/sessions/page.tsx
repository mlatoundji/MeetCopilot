import React from 'react';
import Link from 'next/link';
import MainContent from '../../components/MainContent';

export default function SessionsPage() {
  const mockSessions = [
    { id: '1', title: 'Session 1' },
    { id: '2', title: 'Session 2' },
  ];

  return (
    <MainContent>
      <h1>Sessions</h1>
      <ul>
        {mockSessions.map((session) => (
          <li key={session.id}>
            <Link href={`/sessions/${session.id}`}>{session.title}</Link>
          </li>
        ))}
      </ul>
    </MainContent>
  );
} 