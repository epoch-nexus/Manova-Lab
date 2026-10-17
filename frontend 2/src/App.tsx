import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import BuilderPage from './pages/BuilderPage';
import ResultsPage from './pages/ResultsPage';
import RunnerPage from './pages/RunnerPage';
import AuthPage from './pages/AuthPage';
import SciencePage from './pages/SciencePage';
import SurveyRunnerPage from './pages/SurveyRunnerPage';
import SurveyBuilderPage from './pages/SurveyBuilderPage';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/experiments" element={<DashboardPage />} />
          <Route path="/builder" element={<BuilderPage />} />
          <Route path="/builder/:id" element={<BuilderPage />} />
          <Route path="/builder/:experimentId" element={<BuilderPage />} />
          <Route path="/builder/survey" element={<SurveyBuilderPage />} />
          <Route path="/builder/survey/:id" element={<SurveyBuilderPage />} />
          <Route path="/surveys" element={<DashboardPage />} />
          <Route path="/surveys/builder" element={<SurveyBuilderPage />} />
          <Route path="/surveys/builder/:id" element={<SurveyBuilderPage />} />
          <Route path="/survey/builder" element={<SurveyBuilderPage />} />
          <Route path="/survey/builder/:id" element={<SurveyBuilderPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/results/:experimentId" element={<ResultsPage />} />
          <Route path="/runner" element={<RunnerPage />} />
          <Route path="/runner/:slug" element={<RunnerPage />} />
          <Route path="/run/:slug" element={<RunnerPage />} />
          <Route path="/runner/survey/:id" element={<SurveyRunnerPage />} />
          <Route path="/runner/survey/:experiment_id" element={<SurveyRunnerPage />} />
          <Route path="/surveys/:id" element={<SurveyRunnerPage />} />
          <Route path="/survey/:id" element={<SurveyRunnerPage />} />
          <Route path="/science" element={<SciencePage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
