import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PublicLayout } from '../../layouts/PublicLayout';
import { AppLayout } from '../../layouts/AppLayout';
import { LandingPage } from '../../features/landing/LandingPage';
import { LoginPage } from '../../features/auth/LoginPage';
import { RegisterPage } from '../../features/auth/RegisterPage';
import { ForgotPasswordPage } from '../../features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../../features/auth/ResetPasswordPage';
import { VerifyEmailPage } from '../../features/auth/VerifyEmailPage';
import { EventDetailsPage } from '../../features/events/EventDetailsPage';
import { MyEventsPage } from '../../features/events/MyEventsPage';
import { EventsCalendarPage } from '../../features/events/EventsCalendarPage';
import { ComingSoonPage } from '../../features/dashboard/ComingSoonPage';
import { ProtectedRoute } from '../../components/navigation/ProtectedRoute';
import { ComponentShowcase } from '../../features/showcase/ComponentShowcase';
import { ResearchDashboardPage } from '../../features/research/ResearchDashboardPage';
import { PublicationsPage } from '../../features/research/PublicationsPage';
import { ResearchPaperDetailsPage } from '../../features/research/ResearchPaperDetailsPage';
import { ResearchSubmissionPage } from '../../features/research/ResearchSubmissionPage';
import { MyResearchPage } from '../../features/research/MyResearchPage';
import { ResearchReviewsPage } from '../../features/research/ResearchReviewsPage';
import { CollaborationsPage } from '../../features/research/CollaborationsPage';
import { CollaborationDetailsPage } from '../../features/research/CollaborationDetailsPage';
import {
  MyCollaborationRequestsPage,
  NewCollaborationPage,
} from '../../features/research/CollaborationForms';
import { AlumniDirectoryPage } from '../../features/career/AlumniDirectoryPage';
import { CareerQuestionsPage } from '../../features/career/CareerQuestionsPage';
import {
  CareerConnectionsPage,
  CareerMentorshipPage,
} from '../../features/career/CareerNetworkPages';
import { MessagesPage } from '../../features/career/MessagesPage';
import { PlacementOpportunitiesPage } from '../../features/placements/PlacementOpportunitiesPage';
import { PlacementOpportunityDetailsPage } from '../../features/placements/PlacementOpportunityDetailsPage';
import {
  MyPlacementApplicationsPage,
  PlacementApplicationDetailsPage,
} from '../../features/placements/MyPlacementApplicationsPage';
import { RoleDashboard } from '../../features/faculty/RoleDashboard';
import { FacultyAnnouncementsPage } from '../../features/faculty/FacultyAnnouncementsPage';
import { FacultyAcademicActivitiesPage } from '../../features/faculty/FacultyAcademicActivitiesPage';
import { FacultyEventCreatePage } from '../../features/faculty/FacultyEventCreatePage';
import { RoleCareerConnectPage } from '../../features/career/RoleCareerConnectPage';
import { AlumniDashboardPage } from '../../features/career/AlumniDashboardPage';
import { CareerOpportunitiesPage } from '../../features/career/CareerOpportunitiesPage';
import { RoleEventsPage } from '../../features/administration/RoleEventsPage';
import { RoleAcademicPage } from '../../features/administration/RoleAcademicPage';
import { AdministrationUsersPage } from '../../features/administration/AdministrationUsersPage';
import { AdministrationReportsPage } from '../../features/administration/AdministrationReportsPage';
import { AdministrationEventsPage } from '../../features/administration/AdministrationEventsPage';
import { RolePlacementsPage } from '../../features/administration/RolePlacementsPage';
import { NotificationsPage } from '../../features/shared/NotificationsPage';
import { ProfilePage } from '../../features/shared/ProfilePage';
import { SettingsPage } from '../../features/shared/SettingsPage';
import { PublicProfilePage, SearchResultsPage } from '../../features/shared/SearchPages';

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/design-system', element: <ComponentShowcase /> },
    ],
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/reset-password/:token', element: <ResetPasswordPage /> },
  { path: '/verify-email', element: <VerifyEmailPage /> },
  { path: '/verify-email/:token', element: <VerifyEmailPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/app',
        element: <AppLayout />,
        children: [
          { index: true, element: <RoleDashboard /> },
          { path: 'academics', element: <RoleAcademicPage /> },
          { path: 'academic-activities', element: <FacultyAcademicActivitiesPage /> },
          { path: 'calendar', element: <EventsCalendarPage /> },
          { path: 'announcements', element: <FacultyAnnouncementsPage /> },
          { path: 'events', element: <RoleEventsPage /> },
          { path: 'events/manage', element: <AdministrationEventsPage /> },
          { path: 'events/create', element: <FacultyEventCreatePage /> },
          { path: 'events/mine', element: <MyEventsPage /> },
          { path: 'events/:eventId', element: <EventDetailsPage /> },
          { path: 'research', element: <ResearchDashboardPage /> },
          { path: 'research/publications', element: <PublicationsPage /> },
          { path: 'research/datasets', element: <PublicationsPage /> },
          { path: 'research/my-work', element: <MyResearchPage /> },
          { path: 'research/submit', element: <ResearchSubmissionPage /> },
          { path: 'research/reviews', element: <ResearchReviewsPage /> },
          { path: 'research/new-collaboration', element: <NewCollaborationPage /> },
          { path: 'research/collaborations', element: <CollaborationsPage /> },
          { path: 'research/collaborations/requests', element: <MyCollaborationRequestsPage /> },
          {
            path: 'research/collaborations/:collaborationId',
            element: <CollaborationDetailsPage />,
          },
          { path: 'research/papers/:paperId', element: <ResearchPaperDetailsPage /> },
          { path: 'career-connect', element: <RoleCareerConnectPage /> },
          { path: 'career-connect/alumni', element: <AlumniDirectoryPage /> },
          { path: 'career-connect/questions', element: <CareerQuestionsPage /> },
          { path: 'career-connect/questions/:questionId', element: <CareerQuestionsPage /> },
          { path: 'career-connect/connections', element: <CareerConnectionsPage /> },
          { path: 'placements', element: <RolePlacementsPage /> },
          { path: 'placements/opportunities', element: <PlacementOpportunitiesPage /> },
          {
            path: 'placements/opportunities/:opportunityId',
            element: <PlacementOpportunityDetailsPage />,
          },
          { path: 'placements/applications', element: <MyPlacementApplicationsPage /> },
          {
            path: 'placements/applications/:applicationId',
            element: <PlacementApplicationDetailsPage />,
          },
          { path: 'alumni', element: <AlumniDashboardPage /> },
          { path: 'mentorship', element: <CareerMentorshipPage /> },
          { path: 'conversations', element: <MessagesPage /> },
          { path: 'conversations/:conversationId', element: <MessagesPage /> },
          { path: 'opportunities', element: <CareerOpportunitiesPage /> },
          { path: 'search', element: <SearchResultsPage /> },
          { path: 'people/:id', element: <PublicProfilePage /> },
          { path: 'community', element: <ComingSoonPage /> },
          { path: 'submissions', element: <ResearchReviewsPage /> },
          { path: 'users', element: <AdministrationUsersPage /> },
          { path: 'reports', element: <AdministrationReportsPage /> },
          { path: 'notifications', element: <NotificationsPage /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: 'administration', element: <AdministrationReportsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
