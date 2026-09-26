import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import BuilderPage from './pages/BuilderPage';
import ResultsPage from './pages/ResultsPage';
import RunnerPage from './pages/RunnerPage';
import AuthPage from './pages/AuthPage';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/builder" element={<BuilderPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/runner" element={<RunnerPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
