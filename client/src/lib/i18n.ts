import { useState } from 'react';
import { devLog } from '@/lib/debug';

export const translations = {
  // Basic UI
  login: { en: 'Login', ru: 'Вход' },
  logout: { en: 'Logout', ru: 'Выход' },
  dashboard: { en: 'Dashboard', ru: 'Панель управления' },
  candidates: { en: 'Candidates', ru: 'Кандидаты' },
  vacancies: { en: 'Vacancies', ru: 'Вакансии' },
  calendar: { en: 'Calendar', ru: 'Календарь' },
  analytics: { en: 'Analytics', ru: 'Аналитика' },
  archive: { en: 'Archive', ru: 'Архив' },
  settings: { en: 'Settings', ru: 'Настройки' },
  admin: { en: 'Admin', ru: 'Администрирование' },
  chat: { en: 'Chat', ru: 'Чат' },

  // Common actions
  create: { en: 'Create', ru: 'Создать' },
  edit: { en: 'Edit', ru: 'Редактировать' },
  delete: { en: 'Delete', ru: 'Удалить' },
  save: { en: 'Save', ru: 'Сохранить' },
  cancel: { en: 'Cancel', ru: 'Отмена' },
  update: { en: 'Update', ru: 'Обновить' },
  confirm: { en: 'Confirm', ru: 'Подтвердить' },
  close: { en: 'Close', ru: 'Закрыть' },
  loading: { en: 'Loading...', ru: 'Загрузка...' },
  search: { en: 'Search', ru: 'Поиск' },
  filter: { en: 'Filter', ru: 'Фильтр' },

  // Status
  active: { en: 'Active', ru: 'Активный' },
  inactive: { en: 'Inactive', ru: 'Неактивный' },
  pending: { en: 'Pending', ru: 'Ожидание' },
  completed: { en: 'Completed', ru: 'Завершено' },
  inProgress: { en: 'In Progress', ru: 'В процессе' },
  closed: { en: 'Closed', ru: 'Закрыто' },
  online: { en: 'Online', ru: 'Онлайн' },
  offline: { en: 'Offline', ru: 'Офлайн' },

  // Authentication
  email: { en: 'Email', ru: 'Email' },
  password: { en: 'Password', ru: 'Пароль' },
  enterEmail: { en: 'Enter your email', ru: 'Введите ваш email' },
  enterPassword: { en: 'Enter your password', ru: 'Введите пароль' },
  signIn: { en: 'Sign In', ru: 'Войти' },

  // Forms
  required: { en: 'Required', ru: 'Обязательно' },
  optional: { en: 'Optional', ru: 'Опционально' },

  // Dashboard
  totalVacancies: { en: 'Total Vacancies', ru: 'Всего вакансий' },
  activeCandidates: { en: 'Active Candidates', ru: 'Активные кандидаты' },
  todayInterviews: { en: 'Today\'s Interviews', ru: 'Интервью сегодня' },
  hiredThisMonth: { en: 'Hired This Month', ru: 'Нанято в этом месяце' },
  documentationCandidates: { en: 'In Documentation', ru: 'На оформлении' },
  recentCandidates: { en: 'Recent Candidates', ru: 'Последние кандидаты' },
  viewAll: { en: 'View All', ru: 'Посмотреть все' },
  upcomingInterviews: { en: 'Upcoming Interviews', ru: 'Предстоящие собеседования' },
  viewCalendar: { en: 'View Calendar', ru: 'Посмотреть календарь' },
  recruitmentFunnel: { en: 'Recruitment Funnel', ru: 'Воронка найма' },
  candidateProgression: { en: 'Candidate progression through interview stages', ru: 'Прогресс кандидатов по этапам собеседований' },
  noRecentCandidates: { en: 'No recent candidates', ru: 'Нет последних кандидатов' },
  noInterviewsToday: { en: 'No interviews scheduled for today', ru: 'На сегодня собеседования не запланированы' },
  noUpcomingInterviews: { en: 'No upcoming interviews', ru: 'Нет предстоящих собеседований' },
  applicationReceived: { en: 'Application Received', ru: 'Заявка получена' },
  phoneScreening: { en: 'Phone Screening', ru: 'Телефонное интервью' },
  technicalInterview: { en: 'Technical Interview', ru: 'Техническое собеседование' },
  finalInterview: { en: 'Final Interview', ru: 'Финальное собеседование' },
  hired: { en: 'Hired', ru: 'Нанят' },

  // Calendar
  today: { en: 'Today', ru: 'Сегодня' },
  interviews: { en: 'Interviews', ru: 'Собеседования' },
  monday: { en: 'Monday', ru: 'Понедельник' },
  tuesday: { en: 'Tuesday', ru: 'Вторник' },
  wednesday: { en: 'Wednesday', ru: 'Среда' },
  thursday: { en: 'Thursday', ru: 'Четверг' },
  friday: { en: 'Friday', ru: 'Пятница' },
  saturday: { en: 'Saturday', ru: 'Суббота' },
  sunday: { en: 'Sunday', ru: 'Воскресенье' },
  calendarTitle: { en: 'Calendar', ru: 'Календарь' },
  selectCalendar: { en: 'Select Calendar', ru: 'Выбрать календарь' },

  // General
  welcome: { en: 'Welcome', ru: 'Добро пожаловать' },
  profile: { en: 'Profile', ru: 'Профиль' },

  // Login page
  platformName: { en: 'Cognix Hire', ru: 'Cognix Hire' },
  platformBy: { en: 'Recruitment Platform', ru: 'Платформа для найма' },
  signInToContinue: { en: 'Sign in to continue', ru: 'Войдите, чтобы продолжить' },
  english: { en: 'English', ru: 'English' },
  russian: { en: 'Русский', ru: 'Русский' },

  // Chat and messaging
  employeeChat: { en: 'Employee Chat', ru: 'Чат с сотрудниками' },
  chatWithEmployees: { en: 'Chat with employees', ru: 'Общение с сотрудниками' },
  messages: { en: 'Messages', ru: 'Сообщения' },
  employees: { en: 'Employees', ru: 'Сотрудники' },
  searchEmployees: { en: 'Search employees...', ru: 'Поиск сотрудников...' },
  noSearchResults: { en: 'No search results', ru: 'Результаты поиска не найдены' },
  noConversationsYet: { en: 'No conversations yet', ru: 'Пока нет разговоров' },
  useSearchToStartChat: { en: 'Use search to start a new chat', ru: 'Используйте поиск для начала нового чата' },
  typeMessage: { en: 'Type a message...', ru: 'Напишите сообщение...' },
  sendMessage: { en: 'Send message', ru: 'Отправить сообщение' },
  noMessagesYet: { en: 'No messages yet', ru: 'Пока нет сообщений' },
  startConversation: { en: 'Start a conversation!', ru: 'Начните разговор!' },
  selectEmployee: { en: 'Select an employee', ru: 'Выберите сотрудника' },

  // Additional UI elements
  accountSettings: { en: 'Account Settings', ru: 'Настройки аккаунта' },
  currentRole: { en: 'Current Role', ru: 'Текущая роль' },
  administrator: { en: 'Administrator', ru: 'Администратор' },
  saveChanges: { en: 'Save Changes', ru: 'Сохранить изменения' },
  activeVacancies: { en: 'Active Vacancies', ru: 'Активные вакансии' },
  newVacancy: { en: 'New Vacancy', ru: 'Новая вакансия' },
  position: { en: 'Position', ru: 'Должность' },
  department: { en: 'Department', ru: 'Отдел' },
  status: { en: 'Status', ru: 'Статус' },
  created: { en: 'Created', ru: 'Создано' },
  actions: { en: 'Actions', ru: 'Действия' },
  candidatesLowercase: { en: 'candidates', ru: 'кандидатов' },
  view: { en: 'View', ru: 'Просмотр' },
  administration: { en: 'Administration', ru: 'Администрирование' },
  welcomeMessage: { en: 'Welcome to Cognix Hire', ru: 'Добро пожаловать в Cognix Hire' },
  noNotifications: { en: 'No notifications', ru: 'Нет уведомлений' },

  // Success and error messages
  success: { en: 'Success', ru: 'Успешно' },
  error: { en: 'Error', ru: 'Ошибка' },
  stageUpdatedTitle: { en: 'Stage updated successfully', ru: 'Этап успешно обновлён' },
  stageUpdatedDescription: { en: 'The interview stage has been updated.', ru: 'Этап собеседования обновлён.' },
  stageUpdateFailedTitle: { en: 'Error', ru: 'Ошибка' },
  stageUpdateFailedDescription: { en: 'Failed to update stage. Please try again.', ru: 'Не удалось обновить этап. Попробуйте ещё раз.' },
  stageApprovedComment: { en: 'Approved by interviewer', ru: 'Одобрено интервьюером' },
  stageRejectedComment: { en: 'Rejected by interviewer', ru: 'Отклонено интервьюером' },
  statusPassed: { en: 'Passed', ru: 'Пройден' },
  statusFailed: { en: 'Failed', ru: 'Не пройден' },
  invalidFileTypeTitle: { en: 'Invalid file type', ru: 'Неверный тип файла' },
  fileTooLargeTitle: { en: 'File too large', ru: 'Файл слишком большой' },
  noCropSelectedTitle: { en: 'No crop selected', ru: 'Обрезка не выбрана' },
  noCropSelectedDescription: { en: 'Please crop the image before uploading', ru: 'Пожалуйста, обрежьте изображение перед загрузкой' },
  photoUploadedTitle: { en: 'Photo uploaded successfully', ru: 'Фото успешно загружено' },
  photoUploadedDescription: { en: 'The candidate photo has been updated', ru: 'Фото кандидата обновлено' },
  uploadFailedDescription: { en: 'Failed to upload photo. Please try again.', ru: 'Не удалось загрузить фото. Попробуйте ещё раз.' },

  // Vacancy management
  manageJobPositions: { en: 'Manage Job Positions', ru: 'Управление вакансиями' },
  manageDepartments: { en: 'Manage Departments', ru: 'Управление отделами' },
  createVacancy: { en: 'Create Vacancy', ru: 'Создать вакансию' },
  searchVacancies: { en: 'Search vacancies...', ru: 'Поиск вакансий...' },
  filterByStatus: { en: 'Filter by status', ru: 'Фильтр по статусу' },
  allStatuses: { en: 'All statuses', ru: 'Все статусы' },
  createNewVacancy: { en: 'Create New Vacancy', ru: 'Создать новую вакансию' },
  addNewDepartment: { en: 'Add New Department', ru: 'Добавить новый отдел' },
  departmentName: { en: 'Department Name', ru: 'Название отдела' },
  departmentDescription: { en: 'Department Description', ru: 'Описание отдела' },
  addDepartment: { en: 'Add Department', ru: 'Добавить отдел' },
  adding: { en: 'Adding...', ru: 'Добавление...' },
  existingDepartments: { en: 'Existing Departments', ru: 'Существующие отделы' },
  noDepartmentsYet: { en: 'No departments yet', ru: 'Отделов пока нет' },
  jobTitle: { en: 'Job Title', ru: 'Название вакансии' },
  location: { en: 'Location', ru: 'Местоположение' },
  description: { en: 'Description', ru: 'Описание' },
  requirements: { en: 'Requirements', ru: 'Требования' },
  noVacancies: { en: 'No vacancies found', ru: 'Вакансии не найдены' },
  editVacancy: { en: 'Edit Vacancy', ru: 'Редактировать вакансию' },
  viewDetails: { en: 'View Details', ru: 'Посмотреть детали' },

  // Vacancy success/error messages
  vacancyCreatedSuccessfully: { en: 'Vacancy created successfully', ru: 'Вакансия успешно создана' },
  vacancyUpdatedSuccessfully: { en: 'Vacancy updated successfully', ru: 'Вакансия успешно обновлена' },
  vacancyDeletedSuccessfully: { en: 'Vacancy deleted successfully', ru: 'Вакансия успешно удалена' },
  failedToCreateVacancy: { en: 'Failed to create vacancy', ru: 'Не удалось создать вакансию' },
  failedToUpdateVacancy: { en: 'Failed to update vacancy', ru: 'Не удалось обновить вакансию' },
  failedToDeleteVacancy: { en: 'Failed to delete vacancy', ru: 'Не удалось удалить вакансию' },

  // Department success/error messages
  departmentCreatedSuccessfully: { en: 'Department created successfully', ru: 'Отдел успешно создан' },
  departmentUpdatedSuccessfully: { en: 'Department updated successfully', ru: 'Отдел успешно обновлен' },
  departmentDeletedSuccessfully: { en: 'Department deleted successfully', ru: 'Отдел успешно удален' },
  failedToCreateDepartment: { en: 'Failed to create department', ru: 'Не удалось создать отдел' },
  failedToUpdateDepartment: { en: 'Failed to update department', ru: 'Не удалось обновить отдел' },
  failedToDeleteDepartment: { en: 'Failed to delete department', ru: 'Не удалось удалить отдел' },

  // Candidate management
  manageCandidateProfiles: { en: 'Manage candidate profiles', ru: 'Управление профилями кандидатов' },
  addCandidate: { en: 'Add Candidate', ru: 'Добавить кандидата' },
  searchCandidates: { en: 'Search candidates...', ru: 'Поиск кандидатов...' },
  allStatus: { en: 'All Status', ru: 'Все статусы' },
  rejected: { en: 'Rejected', ru: 'Отклонен' },
  archived: { en: 'Archived', ru: 'В архиве' },
  allPositions: { en: 'All Positions', ru: 'Все позиции' },
  responsible: { en: 'Responsible', ru: 'Ответственный' },
  source: { en: 'Source', ru: 'Источник' },
  noCandidatesFound: { en: 'No candidates found', ru: 'Кандидаты не найдены' },
  adjustSearchCriteria: { en: 'Try adjusting your search criteria', ru: 'Попробуйте изменить критерии поиска' },
  completedInterviewStages: { en: 'Completed Interview Stages', ru: 'Завершенные этапы собеседований' },
  interviewFeedback: { en: 'Interview Feedback', ru: 'Отзывы о собеседованиях' },
  of: { en: 'of', ru: 'из' },

  // Interview management
  interviewStages: { en: 'Interview Stages', ru: 'Этапы собеседования' },
  scheduleNextStage: { en: 'Schedule Next Stage', ru: 'Запланировать следующий этап' },
  currentStage: { en: 'Current Stage', ru: 'Текущий этап' },
  interviewer: { en: 'Interviewer', ru: 'Интервьюер' },
  notAssigned: { en: 'Not assigned', ru: 'Не назначен' },
  scheduleInterview: { en: 'Schedule Interview', ru: 'Запланировать собеседование' },
  interviewStage: { en: 'Interview Stage', ru: 'Этап собеседования' },
  selectStage: { en: 'Select stage', ru: 'Выберите этап' },
  selectInterviewer: { en: 'Select interviewer', ru: 'Выберите интервьюера' },
  time: { en: 'Time', ru: 'Время' },
  date: { en: 'Date', ru: 'Дата' },
  candidate: { en: 'Candidate', ru: 'Кандидат' },
  approve: { en: 'Approve', ru: 'Одобрить' },
  reject: { en: 'Reject', ru: 'Отклонить' },
  approveCandidate: { en: 'Approve Candidate', ru: 'Одобрить кандидата' },
  provideFeedbackForApproval: { en: 'Provide feedback for approval of', ru: 'Оставьте отзыв об одобрении' },
  approvalFeedback: { en: 'Approval Feedback', ru: 'Отзыв об одобрении' },
  provideDetailedFeedback: { en: 'Provide detailed feedback about the interview...', ru: 'Оставьте подробный отзыв о собеседовании...' },
  feedbackRequired: { en: 'Feedback is required', ru: 'Отзыв обязателен' },
  candidateRejectedAtStage: { en: 'Candidate rejected at current stage', ru: 'Кандидат отклонен на текущем этапе' },
  reschedule: { en: 'Reschedule Interview', ru: 'Перенести интервью' },

  // Calendar page specific
  recent: { en: 'Recent', ru: 'Последние' },
  noPastInterviews: { en: 'No past interviews', ru: 'Нет прошедших собеседований' },
  interviewDetails: { en: 'Interview Details', ru: 'Детали собеседования' },
  candidateInformation: { en: 'Candidate Information', ru: 'Информация о кандидате' },
  interviewDetailsLabel: { en: 'Interview Details', ru: 'Детали собеседования' },
  interviewNotes: { en: 'Interview Notes', ru: 'Заметки о собеседовании' },
  rating1to5: { en: 'Rating (1-5)', ru: 'Оценка (1-5)' },
  rescheduleInterview: { en: 'Reschedule Interview', ru: 'Перенести собеседование' },
  outcome: { en: 'Outcome', ru: 'Результат' },
  minutes: { en: 'minutes', ru: 'минут' },
  noInterviewsScheduled: { en: 'No interviews scheduled', ru: 'Собеседования не запланированы' },

  // User management (Admin)
  hr_manager: { en: 'HR Manager', ru: 'HR менеджер' },
  employee: { en: 'Employee', ru: 'Сотрудник' },
  userManagement: { en: 'User Management', ru: 'Управление пользователями' },
  systemSettings: { en: 'System Settings', ru: 'Системные настройки' },
  createUser: { en: 'Create User', ru: 'Создать пользователя' },
  editUser: { en: 'Edit User', ru: 'Редактировать пользователя' },
  deleteUser: { en: 'Delete User', ru: 'Удалить пользователя' },
  addUser: { en: 'Add User', ru: 'Добавить пользователя' },
  fullName: { en: 'Full Name', ru: 'Полное имя' },
  phone: { en: 'Phone', ru: 'Телефон' },
  phonePlaceholder: { en: '+1 (555) 123-45-67', ru: '+7 (999) 123-45-67' },
  role: { en: 'Role', ru: 'Роль' },
  searchUsers: { en: 'Search users...', ru: 'Поиск пользователей...' },
  filterByRole: { en: 'Filter by role', ru: 'Фильтр по роли' },
  allRoles: { en: 'All roles', ru: 'Все роли' },
  noUsersFound: { en: 'No users found', ru: 'Пользователи не найдены' },

  // User success/error messages
  userCreatedSuccessfully: { en: 'User created successfully', ru: 'Пользователь успешно создан' },
  userUpdatedSuccessfully: { en: 'User updated successfully', ru: 'Пользователь успешно обновлен' },
  userDeletedSuccessfully: { en: 'User deleted successfully', ru: 'Пользователь успешно удален' },
  failedToCreateUser: { en: 'Failed to create user', ru: 'Не удалось создать пользователя' },
  failedToUpdateUser: { en: 'Failed to update user', ru: 'Не удалось обновить пользователя' },
  failedToDeleteUser: { en: 'Failed to delete user', ru: 'Не удалось удалить пользователя' },

  // System settings
  emailSettings: { en: 'Email Settings', ru: 'Настройки email' },
  smtpHost: { en: 'SMTP Host', ru: 'SMTP хост' },
  smtpPort: { en: 'SMTP Port', ru: 'SMTP порт' },
  fromEmail: { en: 'From Email', ru: 'Отправитель email' },
  securitySettings: { en: 'Security Settings', ru: 'Настройки безопасности' },
  sessionTimeout: { en: 'Session Timeout (hours)', ru: 'Время сессии (часы)' },
  passwordMinLength: { en: 'Password Min Length', ru: 'Минимальная длина пароля' },
  require2FA: { en: 'Require 2FA', ru: 'Требовать 2FA' },
  saveAllSettings: { en: 'Save All Settings', ru: 'Сохранить все настройки' },

  // Placeholders
  emailPlaceholder: { en: 'john@company.com', ru: 'ivan@example.com' },
  fullNamePlaceholder: { en: 'John Doe', ru: 'Иван Иванов' },
  positionPlaceholder: { en: 'HR Manager', ru: 'HR менеджер' },
  settingNamePlaceholder: { en: 'setting_name', ru: 'название_настройки' },
  settingValuePlaceholder: { en: 'Setting value', ru: 'Значение настройки' },
  settingDescriptionPlaceholder: { en: 'Describe what this setting does...', ru: 'Опишите назначение этой настройки...' },
  smtpHostPlaceholder: { en: 'smtp.gmail.com', ru: 'smtp.gmail.com' },
  smtpPortPlaceholder: { en: '587', ru: '587' },
  fromEmailPlaceholder: { en: 'noreply@company.com', ru: 'noreply@company.com' },
  sessionTimeoutPlaceholder: { en: '24', ru: '24' },
  passwordMinLengthPlaceholder: { en: '8', ru: '8' },
  interviewNotesPlaceholder: { en: 'Add your notes about the interview...', ru: 'Добавьте заметки о собеседовании...' },
  jobTitlePlaceholder: { en: 'e.g. Senior Frontend Developer', ru: 'например, Старший Frontend разработчик' },
  locationPlaceholder: { en: 'e.g. San Francisco, CA or Remote', ru: 'например, Москва или удаленно' },
  selectStatusPlaceholder: { en: 'Select status', ru: 'Выберите статус' },
  jobDescriptionPlaceholder: { en: 'Describe the role, responsibilities, and what you are looking for...', ru: 'Опишите роль, обязанности и требования к кандидату...' },
  jobRequirementsPlaceholder: { en: 'List the key requirements, skills, and qualifications...', ru: 'Перечислите основные требования, навыки и квалификацию...' },
  departmentNamePlaceholder: { en: 'e.g. IT Department', ru: 'например, IT отдел' },
  candidateSourcePlaceholder: { en: 'HeadHunter, LinkedIn, referral', ru: 'HeadHunter, LinkedIn, рекомендация' },
  stageNamePlaceholder: { en: 'Stage name (e.g. HR Interview)', ru: 'Название этапа (например: HR собеседование)' },

  // Validation messages
  jobTitleRequired: { en: 'Job title is required', ru: 'Название вакансии обязательно' },
  departmentRequired: { en: 'Department is required', ru: 'Отдел обязателен' },
  candidateNameRequired: { en: 'Candidate name is required', ru: 'Имя кандидата обязательно' },
  stageNameRequired: { en: 'Stage name must be at least 3 characters', ru: 'Название этапа должно содержать минимум 3 символа' },
  stageNameCannotBeOnlyNumbers: { en: 'Stage name cannot consist only of numbers', ru: 'Название этапа не может состоять только из цифр' },
  fullNameRequired: { en: 'Full name is required', ru: 'Полное имя обязательно' },
  positionRequired: { en: 'Position is required', ru: 'Должность обязательна' },
  emailRequired: { en: 'Email is required', ru: 'Email обязателен' },
  passwordRequired: { en: 'Password is required', ru: 'Пароль обязателен' },
  settingKeyRequired: { en: 'Setting key is required', ru: 'Ключ настройки обязателен' },
  settingValueRequired: { en: 'Setting value is required', ru: 'Значение настройки обязательно' },
  departmentNameRequired: { en: 'Department name is required', ru: 'Название отдела обязательно' },

  // 404 page
  pageNotFound: { en: 'Page Not Found', ru: 'Страница не найдена' },
  pageNotFoundDescription: { en: 'The page you are looking for does not exist.', ru: 'Страница, которую вы ищете, не существует.' },

  // Additional missing translations
  noActiveVacancies: { en: 'No active vacancies', ru: 'Нет активных вакансий' },
  noVacanciesFound: { en: 'No vacancies found', ru: 'Вакансии не найдены' },
  getStartedCreateVacancy: { en: 'Get started by creating your first vacancy', ru: 'Начните с создания первой вакансии' },
  getStartedAddCandidate: { en: 'Get started by adding your first candidate', ru: 'Начните с добавления первого кандидата' },
  noCandidates: { en: 'No candidates', ru: 'Нет кандидатов' },
  noArchiveCandidates: { en: 'No archived candidates', ru: 'Нет архивированных кандидатов' },
  activeVacanciesMetric: { en: 'Active Vacancies', ru: 'Активные вакансии' },
  noPreviousApplication: { en: 'No previous application found. Starting new application...', ru: 'Предыдущая заявка не найдена. Начинаем новую заявку...' },
  errorFetchingApplication: { en: 'Error fetching your application. Starting new application...', ru: 'Ошибка при получении вашей заявки. Начинаем новую заявку...' },
  editingApplication: { en: 'You can edit your application details.', ru: 'Вы можете изменить данные вашей заявки.' },
  editingHiredApplication: { en: 'You have already been hired. You can still update your contact information.', ru: 'Вы уже были наняты. Вы можете обновить контактную информацию.' },
  editingDismissedApplication: { en: 'You were previously dismissed. You can update your application.', ru: 'Вы были уволены ранее. Вы можете обновить свою заявку.' },
  editingRejectedApplication: { en: 'Your previous application was rejected. You can submit a new application.', ru: 'Ваша предыдущая заявка была отклонена. Вы можете подать новую заявку.' },

  // Analytics translations
  analyticsAndReports: { en: 'Analytics & Reports', ru: 'Аналитика и отчёты' },
  trackRecruitmentPerformance: { en: 'Track recruitment performance and metrics', ru: 'Отслеживание показателей эффективности найма' },
  averageDaysToHire: { en: 'Average days to hire', ru: 'Среднее время найма (дни)' },
  conversionFunnel: { en: 'Conversion Funnel', ru: 'Воронка конверсии' },
  applicationsStage: { en: 'Applications', ru: 'Заявки' },
  phoneScreenStage: { en: 'Phone Screen', ru: 'Телефонный отбор' },
  technicalStage: { en: 'Technical', ru: 'Техническое интервью' },
  finalRoundStage: { en: 'Final Round', ru: 'Финальный раунд' },
  hiredStage: { en: 'Hired', ru: 'Приняты' },
  hiringByDepartment: { en: 'Hiring by Department', ru: 'Найм по отделам' },

  // Hired and dismissed analytics
  hiredAndDismissedAnalytics: { en: 'Hired & Dismissed Analytics', ru: 'Аналитика найма и увольнений' },
  totalHiredCandidates: { en: 'Total Hired', ru: 'Всего нанято' },
  totalDismissedCandidates: { en: 'Total Dismissed', ru: 'Всего уволено' },
  currentlyEmployed: { en: 'Currently Employed', ru: 'Сейчас работают' },
  monthlyHiringTrends: { en: 'Monthly Hiring Trends', ru: 'Тенденции найма по месяцам' },
  yearlyHiringTrends: { en: 'Yearly Hiring Trends', ru: 'Тенденции найма по годам' },
  netChange: { en: 'Net Change', ru: 'Чистое изменение' },
  hiredEmployees: { en: 'Hired', ru: 'Нанято' },
  dismissedEmployees: { en: 'Dismissed', ru: 'Уволено' },

  // Time and hiring metrics
  timeToHire: { en: 'Time to Hire', ru: 'Время найма' },
  fastest: { en: 'Fastest', ru: 'Быстрейший' },
  median: { en: 'Median', ru: 'Медиана' },
  slowest: { en: 'Slowest', ru: 'Самый долгий' },
  hiringTrends: { en: 'Hiring Trends', ru: 'Тенденции найма' },
  keyInsights: { en: 'Key Insights', ru: 'Ключевые показатели' },
  noDepartmentDataAvailable: { en: 'No department data available', ru: 'Нет данных по отделам' },
  departmentDataWillAppear: { en: 'Data will appear when candidates are assigned to departments', ru: 'Данные появятся при назначении кандидатов в отделы' },
  openPositions: { en: 'open positions', ru: 'открытых позиций' },
  currentlyHiringFor: { en: 'Currently hiring for', ru: 'В настоящее время ищем' },

  // Calendar specific
  goToCalendar: { en: 'Go to Calendar', ru: 'Перейти к календарю' },
  myCalendar: { en: 'My Calendar', ru: 'Мой календарь' },
  viewInterviewSchedule: { en: 'View and manage your interview schedule', ru: 'Просмотр и управление расписанием собеседований' },
  scheduleFirstInterview: { en: 'Schedule your first interview to see it here', ru: 'Запланируйте первое собеседование, чтобы увидеть его здесь' },

  // Archive page
  archiveTitle: { en: 'Archive', ru: 'Архив' },
  archiveDescription: { en: 'View archived candidates and closed vacancies', ru: 'Просмотр архивированных кандидатов и закрытых вакансий' },
  archivedCandidates: { en: 'Archived Candidates', ru: 'Архивированные кандидаты' },
  closedVacancies: { en: 'Closed Vacancies', ru: 'Закрытые вакансии' },
  noArchivedItems: { en: 'No archived items', ru: 'Нет архивированных элементов' },
  itemsWillAppearHere: { en: 'Archived items will appear here when you move candidates or close vacancies', ru: 'Архивированные элементы появятся здесь при перемещении кандидатов в архив или закрытии вакансий' },

  // Additional form and UI elements
  candidateArchive: { en: 'Candidate Archive', ru: 'Архив кандидатов' },
  allCandidates: { en: 'All Candidates', ru: 'Все кандидаты' },
  hiredCandidates: { en: 'Hired Candidates', ru: 'Нанятые кандидаты' },
  rejectedCandidates: { en: 'Rejected Candidates', ru: 'Отклоненные кандидаты' },
  all: { en: 'All', ru: 'Все' },
  hiredStatus: { en: 'Hired', ru: 'Нанят' },

  // Analytics error handling
  accessDenied: { en: 'Access Denied', ru: 'Доступ запрещен' },
  analyticsAccessDenied: { en: 'You do not have permission to view analytics. Contact your administrator to enable report access.', ru: 'У вас нет прав для просмотра аналитики. Обратитесь к администратору для получения доступа к отчетам.' },
  contactAdminForAccess: { en: 'Contact administrator to enable analytics access', ru: 'Обратитесь к администратору для получения доступа к аналитике' },
  errorLoadingData: { en: 'Error Loading Data', ru: 'Ошибка загрузки данных' },
  analyticsDataLoadError: { en: 'Failed to load analytics data. Please try again later.', ru: 'Не удалось загрузить данные аналитики. Попробуйте позже.' },

  // Account settings
  profileUpdated: { en: 'Profile updated successfully', ru: 'Профиль успешно обновлен' },
  updateFailed: { en: 'Update failed', ru: 'Ошибка обновления' },
  enterFullName: { en: 'Enter full name', ru: 'Введите полное имя' },
  enterPosition: { en: 'Enter position', ru: 'Введите должность' },
  enterPhone: { en: 'Enter phone', ru: 'Введите телефон' },
  roleChangeAdminOnly: { en: 'Only administrators can change roles', ru: 'Только администраторы могут изменять роли' },
  saving: { en: 'Saving...', ru: 'Сохранение...' },
  rejectedStatus: { en: 'Rejected', ru: 'Отклонен' },

  // Additional vacancy management
  createFirstVacancy: { en: 'Create First Vacancy', ru: 'Создать первую вакансию' },
  addFirstCandidate: { en: 'Add First Candidate', ru: 'Добавить первого кандидата' },
  candidatesApplied: { en: 'candidates applied', ru: 'кандидатов подали заявку' },
  vacancy: { en: 'vacancy', ru: 'вакансия' },
  vacanciesLowercase: { en: 'vacancies', ru: 'вакансии' },

  // Header and navigation
  recruitProPlatform: { en: 'Cognix Hire Platform', ru: 'Платформа Cognix Hire' },
  userProfile: { en: 'User Profile', ru: 'Профиль пользователя' },
  notifications: { en: 'Notifications', ru: 'Уведомления' },

  // Additional modals and forms
  scheduleInterviewTitle: { en: 'Schedule Interview', ru: 'Запланировать собеседование' },
  editCandidateTitle: { en: 'Edit Candidate', ru: 'Редактировать кандидата' },
  candidateDetailsTitle: { en: 'Candidate Details', ru: 'Детали кандидата' },
  addCandidateTitle: { en: 'Add New Candidate', ru: 'Добавить нового кандидата' },

  // File operations
  uploadFile: { en: 'Upload File', ru: 'Загрузить файл' },
  fileUploaded: { en: 'File uploaded successfully', ru: 'Файл успешно загружен' },
  fileUploadFailed: { en: 'File upload failed', ru: 'Не удалось загрузить файл' },
  selectFile: { en: 'Select file', ru: 'Выбрать файл' },

  // Photo operations
  candidatePhoto: { en: 'Candidate Photo', ru: 'Фото кандидата' },
  uploadPhoto: { en: 'Upload Photo', ru: 'Загрузить фото' },
  changePhoto: { en: 'Change Photo', ru: 'Изменить фото' },
  deletePhoto: { en: 'Delete Photo', ru: 'Удалить фото' },
  removePhoto: { en: 'Remove Photo', ru: 'Удалить фото' },
  photoOptional: { en: 'Photo is optional', ru: 'Фото необязательно' },
  photoFormat: { en: 'JPG, PNG up to 5MB', ru: 'JPG, PNG до 5МБ' },

  // Interview stage management
  stageName: { en: 'Stage Name', ru: 'Название этапа' },
  stageType: { en: 'Stage Type', ru: 'Тип этапа' },
  addStage: { en: 'Add Stage', ru: 'Добавить этап' },
  removeStage: { en: 'Remove Stage', ru: 'Удалить этап' },

  // Time and date
  selectTime: { en: 'Select time', ru: 'Выберите время' },
  selectDate: { en: 'Select date', ru: 'Выберите дату' },
  duration: { en: 'Duration', ru: 'Продолжительность' },
  hours: { en: 'hours', ru: 'часов' },

  // Status messages
  processing: { en: 'Processing...', ru: 'Обработка...' },
  failed: { en: 'Failed', ru: 'Не удалось' },

  // General UI
  refresh: { en: 'Refresh', ru: 'Обновить' },
  export: { en: 'Export', ru: 'Экспорт' },
  import: { en: 'Import', ru: 'Импорт' },
  print: { en: 'Print', ru: 'Печать' },
  share: { en: 'Share', ru: 'Поделиться' },
  copy: { en: 'Copy', ru: 'Копировать' },
  paste: { en: 'Paste', ru: 'Вставить' },
  cut: { en: 'Cut', ru: 'Вырезать' },

  // Analytics specific translations
  monthlyInterviews: { en: 'Interviews this month', ru: 'Собеседования за месяц' },
  hiredThisMonthMetric: { en: 'Hired this month', ru: 'Нанято за месяц' },
  year: { en: 'Year', ru: 'Год' },
  month: { en: 'Month', ru: 'Месяц' },
  selectPeriod: { en: 'Select period', ru: 'Выберите период' },
  noAnalyticsData: { en: 'No data to display analytics', ru: 'Нет данных для отображения аналитики' },
  noDataAvailable: { en: 'No data available', ru: 'Нет данных' },
  noTrendDataAvailable: { en: 'No trend data available', ru: 'Нет данных по трендам' },
  trendDataWillAppear: { en: 'Data will appear as hiring activity increases', ru: 'Данные появятся по мере увеличения активности найма' },
  monthlyConversionRate: { en: 'Monthly conversion rate', ru: 'Коэффициент конверсии за месяц' },
  fromApplicationToHire: { en: 'From application to hire', ru: 'От заявки до найма' },
  scheduledForSelectedMonth: { en: 'Scheduled for selected month', ru: 'Запланированные на выбранный месяц' },
  rejectionsByStage: { en: 'Rejections by stage', ru: 'Отказы по этапам' },
  rejections: { en: 'rejections', ru: 'отказов' },
  stage: { en: 'Stage', ru: 'Этап' },
  noRejectionData: { en: 'No rejection data', ru: 'Нет данных об отказах' },
  rejectionDataWillAppear: { en: 'Data will appear as candidates are rejected', ru: 'Данные появятся по мере отклонения кандидатов' },

  // Additional missing vacancy modal translations
  enterJobTitle: { en: 'Enter job title', ru: 'Введите название вакансии' },
  selectDepartment: { en: 'Select department', ru: 'Выберите отдел' },
  enterJobDescription: { en: 'Enter job description', ru: 'Введите описание вакансии' },
  enterJobRequirements: { en: 'Enter job requirements', ru: 'Введите требования к вакансии' },
  formValidationFailed: { en: 'Form validation failed', ru: 'Ошибка валидации формы' },
  allDepartments: { en: 'All Departments', ru: 'Все отделы' },
  showingVacanciesFor: { en: 'Showing vacancies for', ru: 'Показываем вакансии для' },
  noDescription: { en: 'No description', ru: 'Нет описания' },
  clickToViewVacancies: { en: 'Click to view vacancies', ru: 'Нажмите для просмотра вакансий' },
  clickToViewDepartment: { en: 'Click to view department', ru: 'Нажмите для просмотра отдела' },
  confirmDeleteDepartment: { en: 'Are you sure you want to delete {name}?', ru: 'Вы уверены, что хотите удалить {name}?' },
  candidatesLowerCase: { en: 'candidates', ru: 'кандидатов' },
  activeCandidatesMetric: { en: 'Active Candidates', ru: 'Активные кандидаты' },

  selectAll: { en: 'Select All', ru: 'Выбрать все' },
  deselectAll: { en: 'Deselect All', ru: 'Отменить выбор' },

  // Additional admin translations
  viewCredentials: { en: 'View credentials', ru: 'Посмотреть учетные данные' },
  noAdminPermission: { en: 'You do not have permission to access the administration section', ru: 'У вас нет прав доступа к разделу администрирования' },
  failedToFetchCredentials: { en: 'Failed to fetch credentials', ru: 'Не удалось получить учетные данные' },
  adminDescription: { en: 'User and system management', ru: 'Управление пользователями и системой' },
  reportsLogs: { en: 'Reports & Logs', ru: 'Отчёты и логи' },
  createManageUserAccounts: { en: 'Create and manage user accounts', ru: 'Создание и управление учетными записями' },
  addNewUser: { en: 'Add New User', ru: 'Добавить нового пользователя' },
  configureSettings: { en: 'Configure system settings', ru: 'Настройка системных параметров' },
  addSetting: { en: 'Add Setting', ru: 'Добавить настройку' },
  addSystemSetting: { en: 'Add System Setting', ru: 'Добавить системную настройку' },
  settingKey: { en: 'Setting Key', ru: 'Ключ настройки' },
  value: { en: 'Value', ru: 'Значение' },
  saveSetting: { en: 'Save Setting', ru: 'Сохранить настройку' },
  interviewSettings: { en: 'Interview Settings', ru: 'Настройки собеседований' },
  workingHoursStart: { en: 'Working Hours Start', ru: 'Начало рабочего дня' },
  workingHoursEnd: { en: 'Working Hours End', ru: 'Конец рабочего дня' },
  interviewDuration: { en: 'Interview Duration (minutes)', ru: 'Продолжительность собеседования (минуты)' },
  reminderTime: { en: 'Reminder Time (minutes before)', ru: 'Время напоминания (минут до)' },
  areYouSureDeleteUser: { en: 'Are you sure you want to delete this user?', ru: 'Вы уверены, что хотите удалить этого пользователя?' },

  // Reports and logs translations
  reportsActivityLogs: { en: 'Activity Logs', ru: 'Логи активности' },
  viewSystemActivity: { en: 'View system activity and user actions', ru: 'Просмотр системной активности и действий пользователей' },
  systemStatistics: { en: 'System Statistics', ru: 'Системная статистика' },
  totalUsers: { en: 'Total Users', ru: 'Всего пользователей' },
  activeUsers: { en: 'Active Users', ru: 'Активные пользователи' },
  administrators: { en: 'Administrators', ru: 'Администраторы' },
  hrManagers: { en: 'HR Managers', ru: 'HR менеджеры' },
  recentActivity: { en: 'Recent Activity', ru: 'Последняя активность' },
  activityLogsWillAppear: { en: 'Activity logs will appear here', ru: 'Логи активности будут отображаться здесь' },
  trackUserActions: { en: 'Track all user actions and system changes', ru: 'Отслеживание всех действий пользователей и системных изменений' },
  exportReports: { en: 'Export Reports', ru: 'Экспорт отчётов' },
  userReportPDF: { en: 'User Report (PDF)', ru: 'Отчёт по пользователям (PDF)' },
  activityLogCSV: { en: 'Activity Log (CSV)', ru: 'Лог активности (CSV)' },
  systemSettingsJSON: { en: 'System Settings (JSON)', ru: 'Настройки системы (JSON)' },
  userCredentials: { en: 'User Credentials', ru: 'Учетные данные пользователя' },
  fullNameLabel: { en: 'Full Name', ru: 'Полное имя' },
  emailLogin: { en: 'Email (Login)', ru: 'Email (Логин)' },
  passwordLabel: { en: 'Password', ru: 'Пароль' },
  positionLabel: { en: 'Position', ru: 'Должность' },
  roleLabel: { en: 'Role', ru: 'Роль' },
  copiedToClipboard: { en: 'Copied to clipboard', ru: 'Скопировано в буфер' },
  credentialsCopied: { en: 'User credentials copied to clipboard', ru: 'Учетные данные пользователя скопированы в буфер' },

  // Additional admin missing translations
  hrManager: { en: 'HR Manager', ru: 'HR менеджер' },
  dateOfBirth: { en: 'Date of Birth', ru: 'Дата рождения' },
  reportsAccess: { en: 'Reports Access', ru: 'Доступ к отчётам' },
  allowReportsAccess: { en: 'Allow access to reports and analytics', ru: 'Разрешить доступ к отчётам и аналитике' },
  activeAccount: { en: 'Active Account', ru: 'Активный аккаунт' },
  canLoginAccess: { en: 'User can login and access the system', ru: 'Пользователь может войти в систему и получить доступ' },
  updateUser: { en: 'Update User', ru: 'Обновить пользователя' },
  createFirstUser: { en: 'Create your first user to get started', ru: 'Создайте первого пользователя для начала работы' },
  copyToClipboard: { en: 'Copy to Clipboard', ru: 'Копировать в буфер' },

  // Toast messages for admin
  userCreatedSuccessfullyTitle: { en: 'User created successfully', ru: 'Пользователь успешно создан' },
  newUserAddedDescription: { en: 'The new user has been added and will receive login credentials via email.', ru: 'Новый пользователь добавлен и получит учетные данные по электронной почте.' },
  failedCreateUserDescription: { en: 'Failed to create user. Please try again.', ru: 'Не удалось создать пользователя. Пожалуйста, попробуйте снова.' },
  userUpdatedSuccessfullyTitle: { en: 'User updated successfully', ru: 'Пользователь успешно обновлён' },
  userInformationUpdatedDescription: { en: 'The user information has been updated.', ru: 'Информация о пользователе была обновлена.' },
  failedUpdateUserDescription: { en: 'Failed to update user. Please try again.', ru: 'Не удалось обновить пользователя. Пожалуйста, попробуйте снова.' },
  userDeletedSuccessfullyTitle: { en: 'User deleted successfully', ru: 'Пользователь успешно удалён' },
  userRemovedFromSystemDescription: { en: 'The user has been removed from the system.', ru: 'Пользователь был удалён из системы.' },
  failedDeleteUserDescription: { en: 'Failed to delete user. Please try again.', ru: 'Не удалось удалить пользователя. Пожалуйста, попробуйте снова.' },
  settingUpdatedSuccessfullyTitle: { en: 'Setting updated successfully', ru: 'Настройка успешно обновлена' },
  systemSettingSavedDescription: { en: 'The system setting has been saved.', ru: 'Системная настройка была сохранена.' },
  failedUpdateSettingDescription: { en: 'Failed to update setting. Please try again.', ru: 'Не удалось обновить настройку. Пожалуйста, попробуйте снова.' },

  // Validation error messages
  invalidEmailAddress: { en: 'Invalid email address', ru: 'Неверный адрес электронной почты' },
  fullNameRequiredValidation: { en: 'Full name is required', ru: 'Полное имя обязательно' },
  settingKeyRequiredValidation: { en: 'Setting key is required', ru: 'Ключ настройки обязателен' },
  settingValueRequiredValidation: { en: 'Setting value is required', ru: 'Значение настройки обязательно' },

  // Default setting descriptions
  startOfWorkingHoursDescription: { en: 'Start of working hours for interview scheduling', ru: 'Начало рабочего дня для планирования собеседований' },
  endOfWorkingHoursDescription: { en: 'End of working hours for interview scheduling', ru: 'Конец рабочего дня для планирования собеседований' },
  defaultInterviewDurationDescription: { en: 'Default interview duration in minutes', ru: 'Стандартная продолжительность собеседования в минутах' },
  interviewReminderTimeDescription: { en: 'Interview reminder time in minutes before interview', ru: 'Время напоминания о собеседовании в минутах до начала' },

  // Additional error messages for authentication
  pleaseLoginAgainMessage: { en: 'Please log in again to access user data.', ru: 'Пожалуйста, войдите в систему снова для доступа к данным пользователей.' },
  adminAccessRequiredMessage: { en: 'Admin access required to view data.', ru: 'Требуется доступ администратора для просмотра данных.' },
  notAvailable: { en: 'N/A', ru: 'Н/Д' },

  // Missing keys for AddCandidateModal
  createCandidateProfile: { en: 'Create candidate profile and define interview stage chain', ru: 'Создайте профиль кандидата и определите цепочку этапов собеседований' },
  selectVacancy: { en: 'Select vacancy', ru: 'Выберите вакансию' },
  attachFiles: { en: 'Attach files (maximum 5)', ru: 'Прикрепить файлы (максимум 5)' },
  tooManyFiles: { en: 'Too many files', ru: 'Слишком много файлов' },
  maxFilesError: { en: 'You can attach maximum 5 files', ru: 'Можно прикрепить максимум 5 файлов' },
  interviewStageChain: { en: 'Interview stage chain *', ru: 'Цепочка этапов собеседований *' },
  addStagesForPosition: { en: 'Add as many stages as needed for this position', ru: 'Добавьте столько этапов, сколько необходимо для этой позиции' },
  createdStages: { en: 'Created stages:', ru: 'Созданные этапы:' },
  creating: { en: 'Creating...', ru: 'Создание...' },
  createCandidate: { en: 'Create candidate', ru: 'Создать кандидата' },
  cityPlaceholder: { en: 'Moscow', ru: 'Москва' },

  // Missing keys for EditCandidateModal
  editCandidate: { en: 'Edit Candidate', ru: 'Редактировать кандидата' },
  updateCandidateInfo: { en: 'Update candidate information', ru: 'Обновите информацию о кандидате' },
  editStagesDescription: { en: 'Edit interview stages for this position', ru: 'Редактируйте этапы собеседований для данной позиции' },
  currentStages: { en: 'Current stages', ru: 'Текущие этапы' },
  attachNewFiles: { en: 'Attach new files (maximum 5)', ru: 'Прикрепить новые файлы (максимум 5)' },
  existingFiles: { en: 'Existing files', ru: 'Существующие файлы' },
  currentAttachment: { en: 'Current attachment', ru: 'Текущий файл' },
  removeFile: { en: 'Remove file', ru: 'Удалить файл' },
  candidateUpdated: { en: 'Candidate updated', ru: 'Кандидат обновлен' },
  candidateDataSaved: { en: 'Candidate data successfully saved', ru: 'Данные кандидата успешно сохранены' },
  failedToUpdateCandidate: { en: 'Failed to update candidate', ru: 'Не удалось обновить кандидата' },

  // Schema validation messages  
  invalidEmailFormat: { en: 'Invalid email format', ru: 'Неверный формат email' },
  selectVacancyRequired: { en: 'Select vacancy', ru: 'Выберите вакансию' },
  selectInterviewerRequired: { en: 'Select interviewer', ru: 'Выберите интервьюера' },
  addAtLeastOneStage: { en: 'Add at least one interview stage', ru: 'Добавьте хотя бы один этап собеседования' },

  // Additional UI translations
  duplicateStageError: { en: 'A stage with this name already exists', ru: 'Этап с таким названием уже существует' },
  stageAdded: { en: 'Stage added', ru: 'Этап добавлен' },

  // Documentation section translations
  documentation: { en: 'Documentation', ru: 'Оформление' },
  candidateDocumentation: { en: 'Candidate Documentation', ru: 'Оформление кандидатов' },
  documentationManagement: { en: 'Documentation Management', ru: 'Управление оформлением' },
  candidatesInDocumentation: { en: 'Candidates in Documentation', ru: 'Кандидаты в оформлении' },
  documentationProcess: { en: 'Documentation Process', ru: 'Процесс оформления' },
  attachDocuments: { en: 'Attach Documents', ru: 'Прикрепить документы' },
  uploadDocuments: { en: 'Upload Documents', ru: 'Загрузить документы' },
  documentsAttached: { en: 'Documents Attached', ru: 'Документы прикреплены' },
  noDocumentsAttached: { en: 'No documents attached', ru: 'Документы не прикреплены' },
  selectDocuments: { en: 'Select documents to upload', ru: 'Выберите документы для загрузки' },
  maxDocuments: { en: 'Maximum 10 documents allowed', ru: 'Максимум 10 документов' },
  documentsUploaded: { en: 'Documents uploaded successfully', ru: 'Документы успешно загружены' },
  documentUploadFailed: { en: 'Document upload failed', ru: 'Не удалось загрузить документы' },
  removeDocument: { en: 'Remove document', ru: 'Удалить документ' },
  downloadDocument: { en: 'Download document', ru: 'Скачать документ' },
  completeDocumentation: { en: 'Complete Documentation', ru: 'Завершить оформление' },
  markAsHired: { en: 'Mark as Hired', ru: 'Отметить как нанятого' },
  candidateHired: { en: 'Candidate Hired', ru: 'Кандидат нанят' },
  documentationCompleted: { en: 'Documentation completed successfully', ru: 'Оформление успешно завершено' },
  documentationFailed: { en: 'Failed to complete documentation', ru: 'Не удалось завершить оформление' },
  addManualCandidate: { en: 'Add Manual Candidate', ru: 'Добавить кандидата вручную' },
  manualCandidateDescription: { en: 'Add candidates who were hired before using this platform', ru: 'Добавить кандидатов, нанятых до использования платформы' },
  prePlatformHire: { en: 'Pre-platform Hire', ru: 'Найм до платформы' },
  candidateAddedToDocumentation: { en: 'Candidate added to documentation', ru: 'Кандидат добавлен в оформление' },
  failedToAddCandidate: { en: 'Failed to add candidate', ru: 'Не удалось добавить кандидата' },
  moveToDocumentation: { en: 'Move to Documentation', ru: 'Перевести в оформление' },
  candidateMovedToDocumentation: { en: 'Candidate moved to documentation', ru: 'Кандидат переведён в оформление' },
  failedToMoveCandidate: { en: 'Failed to move candidate', ru: 'Не удалось перевести кандидата' },
  allStagesMustBeCompleted: { en: 'All interview stages must be completed first', ru: 'Сначала должны быть завершены все этапы собеседований' },
  documentationStatus: { en: 'Documentation Status', ru: 'Статус оформления' },
  documentsRequired: { en: 'Documents Required', ru: 'Требуются документы' },
  documentsComplete: { en: 'Documents Complete', ru: 'Документы готовы' },
  readyForHire: { en: 'Ready for Hire', ru: 'Готов к найму' },
  inDocumentation: { en: 'In Documentation', ru: 'В оформлении' },
  documentationQueue: { en: 'Documentation Queue', ru: 'Очередь оформления' },
  pendingDocuments: { en: 'Pending Documents', ru: 'Ожидают документы' },
  documentsList: { en: 'Documents List', ru: 'Список документов' },
  attachedDocuments: { en: 'Attached Documents', ru: 'Прикреплённые документы' },
  documentName: { en: 'Document Name', ru: 'Название документа' },
  fileSize: { en: 'File Size', ru: 'Размер файла' },
  uploadDate: { en: 'Upload Date', ru: 'Дата загрузки' },
  uploadedBy: { en: 'Uploaded By', ru: 'Загружено' },
  documentActions: { en: 'Document Actions', ru: 'Действия с документом' },
  confirmDeleteDocument: { en: 'Are you sure you want to delete this document?', ru: 'Вы уверены, что хотите удалить этот документ?' },
  documentDeleted: { en: 'Document deleted', ru: 'Документ удалён' },
  failedToDeleteDocument: { en: 'Failed to delete document', ru: 'Не удалось удалить документ' },
  noDocumentationCandidates: { en: 'No candidates in documentation', ru: 'Нет кандидатов в оформлении' },
  documentationCandidatesWillAppear: { en: 'Candidates will appear here after completing all interview stages', ru: 'Кандидаты появятся здесь после прохождения всех этапов собеседований' },
  hide: { en: 'Hide', ru: 'Скрыть' },
  manageDocuments: { en: 'Manage Documents', ru: 'Управлять документами' },
  confirmCompleteDocumentation: { en: 'Are you sure you want to complete documentation for this candidate?', ru: 'Вы уверены, что хотите завершить оформление для этого кандидата?' },

  // Dismissal translations
  dismiss: { en: 'Dismiss', ru: 'Уволить' },
  dismissed: { en: 'Dismissed', ru: 'Уволен' },
  dismissedStatus: { en: 'Dismissed', ru: 'Уволен' },
  dismissedCandidates: { en: 'Dismissed Candidates', ru: 'Уволенные кандидаты' },
  dismissCandidate: { en: 'Dismiss Candidate', ru: 'Уволить кандидата' },
  dismissCandidateDescription: { en: 'Provide reason and date for dismissal of', ru: 'Укажите причину и дату увольнения' },
  dismissalReason: { en: 'Dismissal Reason', ru: 'Причина увольнения' },
  dismissalDate: { en: 'Dismissal Date', ru: 'Дата увольнения' },
  specifyDismissalReason: { en: 'Specify the reason for dismissal...', ru: 'Укажите причину увольнения...' },
  dismissalReasonRequired: { en: 'Dismissal reason is required', ru: 'Причина увольнения обязательна' },
  candidateDismissed: { en: 'Candidate Dismissed', ru: 'Кандидат уволен' },
  candidateDismissedSuccess: { en: 'Candidate has been successfully dismissed', ru: 'Кандидат успешно уволен' },
  failedToDismissCandidate: { en: 'Failed to dismiss candidate', ru: 'Не удалось уволить кандидата' },
  updated: { en: 'Updated', ru: 'Обновлено' },
  rejectionReason: { en: 'Rejection Reason', ru: 'Причина отказа' },
  stageLabel: { en: 'Stage', ru: 'Этап' },
  sourceLabel: { en: 'Source', ru: 'Источник' },

  // Candidate Details Modal translations
  candidateDetailsDescription: { en: 'Detailed information about the candidate and interview progress', ru: 'Подробная информация о кандидате и прогрессе собеседований' },
  contactInformation: { en: 'Contact Information', ru: 'Контактная информация' },
  appliedOn: { en: 'Applied', ru: 'Отклик' },
  notSpecified: { en: 'Not specified', ru: 'Не указан' },
  positionInformation: { en: 'Position Information', ru: 'Информация о позиции' },
  responsibleManager: { en: 'Responsible Manager', ru: 'Ответственный менеджер' },
  downloadResume: { en: 'Download Resume', ru: 'Скачать резюме' },
  resumeLabel: { en: 'Resume', ru: 'Резюме' },
  fileTypePdf: { en: 'PDF', ru: 'PDF' },
  documentationFiles: { en: 'Documentation Files', ru: 'Файлы документации' },

  // Delete candidate functionality
  deleteCandidate: { en: 'Delete Candidate', ru: 'Удалить кандидата' },
  deleteCandidateConfirmation: { en: 'Are you sure you want to permanently delete', ru: 'Вы уверены, что хотите навсегда удалить' },
  deleteCandidateWarning: { en: 'This action cannot be undone!', ru: 'Это действие нельзя отменить!' },
  candidateDeleted: { en: 'Candidate Deleted', ru: 'Кандидат удален' },
  candidateDeletedSuccessfully: { en: 'Candidate has been successfully deleted', ru: 'Кандидат был успешно удален' },
  failedToDeleteCandidate: { en: 'Failed to delete candidate', ru: 'Не удалось удалить кандидата' },
  deleting: { en: 'Deleting...', ru: 'Удаление...' },

  // Feedback editing functionality
  feedbackUpdated: { en: 'Feedback Updated', ru: 'Отзыв обновлён' },
  feedbackUpdatedSuccessfully: { en: 'Interview feedback has been successfully updated', ru: 'Отзыв о собеседовании успешно обновлён' },
  failedToUpdateFeedback: { en: 'Failed to update feedback', ru: 'Не удалось обновить отзыв' },
  dismissalInformation: { en: 'Dismissal Information', ru: 'Информация об увольнении' },
  interviewProgress: { en: 'Interview Progress', ru: 'Прогресс собеседований' },
  interviewHistory: { en: 'Interview History', ru: 'История собеседований' },
  stagesCompleted: { en: 'stages completed', ru: 'этапов завершено' },
  at: { en: 'at', ru: 'в' },
  left: { en: 'Left', ru: 'Оставлен' },
  rating: { en: 'Rating', ru: 'Оценка' },
  noInterviewStagesConfigured: { en: 'Interview stages are not configured', ru: 'Этапы собеседований не настроены' },
  notes: { en: 'Notes', ru: 'Заметки' },
  needScheduleInterview: { en: 'Need to schedule interview time', ru: 'Требуется назначить время собеседования' },

  // Additional missing translations - fixes for user issues
  city: { en: 'City', ru: 'Город' },
  Vacancy: { en: 'Vacancy', ru: 'Вакансия' },
  interviewerPlaceholder: { en: 'Select interviewer', ru: 'Выберите интервьюера' },
  notesPlaceholder: { en: 'Add your notes...', ru: 'Добавьте заметки...' },
  allSources: { en: 'All sources', ru: 'Все источники' },
  manualEntry: { en: 'Manual Entry', ru: 'Ручной ввод' },
  with: { en: 'with', ru: 'с' },
  warning: { en: 'Warning', ru: 'Предупреждение' },
  successTitle: { en: 'Success', ru: 'Успешно' },
  errorOccurred: { en: 'An error occurred', ru: 'Произошла ошибка' },
  checkDataAndTryAgain: { en: 'Check the data and try again.', ru: 'Проверьте данные и попробуйте снова.' },
  errorCreatingCandidate: { en: 'Failed to create candidate', ru: 'Не удалось создать кандидата' },
  candidateAddedSuccess: { en: 'added successfully', ru: 'успешно добавлен' },
  fillCandidateName: { en: 'Please enter candidate name', ru: 'Введите имя кандидата' },
  fillDateAndTime: { en: 'Please select date and time', ru: 'Выберите дату и время' },
  addInterviewNotes: { en: 'Add interview notes', ru: 'Добавить заметки интервью' },
  notesOptional: { en: 'Notes (optional)', ru: 'Заметки (необязательно)' },
  selectDuration: { en: 'Select duration', ru: 'Выберите длительность' },
  durationMinutes: { en: 'Duration (minutes)', ru: 'Длительность (минуты)' },
  minutes15: { en: '15 minutes', ru: '15 минут' },
  minutes30: { en: '30 minutes', ru: '30 минут' },
  minutes45: { en: '45 minutes', ru: '45 минут' },
  hour1: { en: '1 hour', ru: '1 час' },
  hours1_5: { en: '1.5 hours', ru: '1.5 часа' },
  hours2: { en: '2 hours', ru: '2 часа' },
  interviewDate: { en: 'Interview date', ru: 'Дата интервью' },
  interviewInfo: { en: 'Interview info', ru: 'Информация о собеседовании' },
  interviewWithCandidate: { en: 'Interview with candidate', ru: 'Интервью с кандидатом' },
  interviewScheduled: { en: 'Interview scheduled', ru: 'Интервью запланировано' },
  interviewRescheduled: { en: 'Interview rescheduled', ru: 'Интервью перенесено' },
  interviewTimeChanged: { en: 'Interview time changed', ru: 'Время интервью изменено' },
  interviewResultUpdated: { en: 'Interview result updated', ru: 'Результат интервью обновлён' },
  interviewNotification: { en: 'interview notification', ru: 'уведомление о собеседовании' },
  willReceive: { en: 'will receive', ru: 'получит' },
  interviewerLabel: { en: 'Interviewer', ru: 'Интервьюер' },
  interviewerBusy: { en: 'Interviewer is busy', ru: 'Интервьюер занят' },
  selectDifferentTime: { en: 'Please select a different time', ru: 'Выберите другое время' },
  failedToScheduleInterview: { en: 'Failed to schedule interview', ru: 'Не удалось запланировать интервью' },
  failedToReschedule: { en: 'Failed to reschedule interview', ru: 'Не удалось перенести интервью' },
  failedToSaveResult: { en: 'Failed to save result', ru: 'Не удалось сохранить результат' },
  failedToLoadData: { en: 'Failed to load data', ru: 'Не удалось загрузить данные' },
  resultSaved: { en: 'Result saved', ru: 'Результат сохранён' },
  rescheduled: { en: 'Rescheduled', ru: 'Перенесено' },
  scheduled: { en: 'Scheduled', ru: 'Запланировано' },
  cancelled: { en: 'Cancelled', ru: 'Отменено' },
  planning: { en: 'Planning', ru: 'Планирование' },
  planningStage: { en: 'Planning stage', ru: 'Планирование этапа' },
  planningNextStage: { en: 'Planning next stage for', ru: 'Планирование следующего этапа для' },
  planInterview: { en: 'Plan interview', ru: 'Запланировать интервью' },
  schedule: { en: 'Schedule', ru: 'Запланировать' },
  next: { en: 'Next', ru: 'Далее' },
  for: { en: 'for', ru: 'для' },
  interviewDateLabel: { en: 'Interview date', ru: 'Дата интервью' },
  newTime: { en: 'New time', ru: 'Новое время' },
  interviewerLabelShort: { en: 'Interviewer', ru: 'Интервьюер' },
  interviewInfoLabel: { en: 'Interview info', ru: 'Информация о собеседовании' },
  candidateCard: { en: 'Candidate card', ru: 'Карточка кандидата' },
  candidateRemovedFromSystem: { en: 'Candidate removed from system', ru: 'Кандидат удалён из системы' },
  onlyResponsibleManager: { en: 'Only the responsible manager can do this', ru: 'Только ответственный менеджер может выполнить это действие' },
  candidateMovedToArchive: { en: 'Candidate moved to archive', ru: 'Кандидат перемещён в архив' },
  candidateMovedToNext: { en: 'Candidate moved to next stage', ru: 'Кандидат переведён на следующий этап' },
  candidateRejected: { en: 'Candidate rejected', ru: 'Кандидат отклонён' },
  candidateHiredSuccess: { en: 'Candidate hired successfully', ru: 'Кандидат успешно нанят' },
  allStagesCompleted: { en: 'All stages completed', ru: 'Все этапы завершены' },
  nowCandidateCanBeHired: { en: 'Candidate can now be hired', ru: 'Кандидата можно нанимать' },
  stageCompleted: { en: 'Stage completed', ru: 'Этап завершён' },
  failedToCompleteStage: { en: 'Failed to complete stage', ru: 'Не удалось завершить этап' },
  failedToRejectCandidate: { en: 'Failed to reject candidate', ru: 'Не удалось отклонить кандидата' },
  specifyRejectionReason: { en: 'Specify rejection reason', ru: 'Укажите причину отказа' },
  specifyRejectionPlaceholder: { en: 'Specify rejection reason...', ru: 'Укажите причину отказа...' },
  rejectCandidate: { en: 'Reject candidate', ru: 'Отклонить кандидата' },
  hireCandidate: { en: 'Hire candidate', ru: 'Нанять кандидата' },
  allStagesCompletedTitle: { en: 'All stages completed', ru: 'Все этапы завершены' },
  resume: { en: 'Resume', ru: 'Резюме' },
  resumeAttached: { en: 'Resume attached', ru: 'Резюме прикреплено' },
  viewDocuments: { en: 'View documents', ru: 'Посмотреть документы' },
  stages: { en: 'Stages', ru: 'Этапы' },
  passed: { en: 'Passed', ru: 'Пройден' },
  failed: { en: 'Failed', ru: 'Не пройден' },
  waiting: { en: 'Waiting', ru: 'Ожидание' },
  user: { en: 'User', ru: 'Пользователь' },
  inactiveUsers: { en: 'Inactive users', ru: 'Неактивные пользователи' },
  lastUpdated: { en: 'Last updated', ru: 'Последнее обновление' },
  copyEmailToClipboard: { en: 'Email copied to clipboard', ru: 'Email скопирован в буфер обмена' },
  passwordNotAvailable: { en: 'Password not available', ru: 'Пароль недоступен' },
  noPermissionToAccessThisSection: { en: 'You do not have permission to access this section', ru: 'У вас нет доступа к этому разделу' },
  pleaseLogin: { en: 'Please log in', ru: 'Пожалуйста, войдите в систему' },
  confirmDeleteCandidate: { en: 'Confirm candidate deletion', ru: 'Подтвердите удаление кандидата' },
  thisActionCannotBeUndone: { en: 'This action cannot be undone', ru: 'Это действие нельзя отменить' },
  sourcePlaceholder: { en: 'Enter source', ru: 'Укажите источник' },
  enterLocation: { en: 'Enter location', ru: 'Введите местоположение' },
  positionTBD: { en: 'Position TBD', ru: 'Позиция не определена' },
  stageCount: { en: 'Stage', ru: 'Этап' },
  candidateTBD: { en: 'Candidate TBD', ru: 'Кандидат не указан' },
  interviewerTBD: { en: 'Interviewer TBD', ru: 'Интервьюер не указан' },
  locationTBD: { en: 'Location TBD', ru: 'Место не указано' },
  uploadCandidatePhoto: { en: 'Upload Candidate Photo', ru: 'Загрузить фото кандидата' },
  clickToSelectPhoto: { en: 'Click to select a photo', ru: 'Нажмите, чтобы выбрать фото' },
  cropYourPhoto: { en: 'Crop your photo (1:1 ratio)', ru: 'Обрежьте фото (соотношение 1:1)' },
  selectNew: { en: 'Select New', ru: 'Выбрать новое' },
  uploadFailed: { en: 'Upload failed', ru: 'Ошибка загрузки' },

  // Month names
  january: { en: 'January', ru: 'Январь' },
  february: { en: 'February', ru: 'Февраль' },
  march: { en: 'March', ru: 'Март' },
  april: { en: 'April', ru: 'Апрель' },
  may: { en: 'May', ru: 'Май' },
  june: { en: 'June', ru: 'Июнь' },
  july: { en: 'July', ru: 'Июль' },
  august: { en: 'August', ru: 'Август' },
  september: { en: 'September', ru: 'Сентябрь' },
  october: { en: 'October', ru: 'Октябрь' },
  november: { en: 'November', ru: 'Ноябрь' },
  december: { en: 'December', ru: 'Декабрь' },

  // Additional missing keys

  // Interview scheduling
  interviewFor: { en: 'Interview for', ru: 'Собеседование для кандидата' },
  withCandidate: { en: 'with candidate', ru: 'с кандидатом' },
  atTime: { en: 'at', ru: 'в' },
  onlyRecruiterOrInterviewerCanManageInterview: { en: 'Only the recruiter or the interviewer can manage this interview', ru: 'Только рекрутер или интервьюер может управлять этим собеседованием' },
  interviewFeedbackHistory: { en: 'Interview Feedback History', ru: 'История отзывов о собеседованиях' },

  // Photo upload messages
  candidateCreatedPhotoFailed: { en: 'Candidate created successfully, but photo upload failed. You can add it later by editing the candidate.', ru: 'Кандидат успешно создан, но не удалось загрузить фото. Вы можете добавить его позже при редактировании.' },
  selectImageFile: { en: 'Please select an image file', ru: 'Пожалуйста, выберите файл изображения' },
  imageTooLarge: { en: 'Please select an image smaller than 5MB', ru: 'Пожалуйста, выберите изображение меньше 5МБ' },

  // Super Admin
  superAdminPanel: { en: 'Super Admin Panel', ru: 'Панель суперадминистратора' },
  manageWorkspaces: { en: 'Manage Cognix Hire Workspaces', ru: 'Управление рабочими областями Cognix Hire' },
  createWorkspace: { en: 'Create Workspace', ru: 'Создать рабочую область' },
  workspaceCreated: { en: 'Workspace Created!', ru: 'Рабочая область создана!' },
  workspaceCreatedTitle: { en: 'Workspace Created', ru: 'Рабочая область создана' },
  workspaceCreatedDesc: { en: 'Workspace created successfully. Save the admin credentials!', ru: 'Рабочая область успешно создана. Сохраните учетные данные администратора!' },
  adminEmail: { en: 'Admin Email:', ru: 'Email администратора:' },
  adminPassword: { en: 'Password:', ru: 'Пароль:' },
  saveCredentialsWarning: { en: '⚠️ Save these credentials! They will not be shown again.', ru: '⚠️ Сохраните эти данные! Они больше не будут показаны.' },
  noWorkspaces: { en: 'No Workspaces', ru: 'Нет рабочих областей' },
  createFirstWorkspace: { en: 'Create your first workspace to get started', ru: 'Создайте первую рабочую область для начала работы' },
  workspaceCreatedDate: { en: 'Created:', ru: 'Создана:' },
  enterWorkspace: { en: 'Enter', ru: 'Войти' },
  adminButton: { en: 'Admin', ru: 'Админ' },
  createWorkspaceTitle: { en: 'Create Workspace', ru: 'Создать рабочую область' },
  createWorkspaceDesc: { en: 'Create a new workspace for a company. An admin will be created automatically.', ru: 'Создайте новую рабочую область для компании. Будет автоматически создан администратор.' },
  companyNameLabel: { en: 'Company Name *', ru: 'Название компании *' },
  companyNamePlaceholder: { en: 'Example: Acme Corp', ru: 'Например: ООО Компания' },
  companyLogoLabel: { en: 'Company Logo (optional)', ru: 'Логотип компании (необязательно)' },

  adminDataTitle: { en: 'Admin Data - {name}', ru: 'Данные администратора - {name}' },
  adminDataDescription: { en: 'Admin credentials for system access', ru: 'Учетные данные администратора для входа в систему' },

  emailLoginLabel: { en: 'Email (login)', ru: 'Email (логин)' },
  hiddenForSecurity: { en: '(Hidden for security)', ru: '(Скрыт в целях безопасности)' },
  editAdminTitle: { en: 'Edit Admin Data', ru: 'Редактировать данные администратора' },
  editAdminDescription: { en: 'Edit credentials for {name}', ru: 'Изменение учетных данных для {name}' },
  newPassword: { en: 'New Password', ru: 'Новый пароль' },
  leaveEmptyToKeep: { en: 'Leave empty to keep current', ru: 'Оставьте пустым, чтобы не менять' },
  passwordHint: { en: 'Leave empty if you do not want to change the password', ru: 'Если не нужно менять пароль, оставьте поле пустым' },

  workspaceDeletedTitle: { en: 'Workspace Deleted', ru: 'Рабочая область удалена' },
  workspaceDeletedDesc: { en: 'Workspace deleted successfully', ru: 'Рабочая область успешно удалена' },
  deleteWorkspaceFailed: { en: 'Failed to delete workspace', ru: 'Не удалось удалить рабочую область' },
  dataUpdatedTitle: { en: 'Data Updated', ru: 'Данные обновлены' },
  adminDataUpdatedDesc: { en: 'Admin data updated successfully', ru: 'Данные администратора успешно обновлены' },
  updateAdminFailed: { en: 'Failed to update admin data', ru: 'Не удалось обновить данные администратора' },
  enterWorkspaceName: { en: 'Enter workspace name', ru: 'Введите название рабочей области' },
  deleteWorkspaceConfirm: { en: 'Are you sure you want to delete workspace "{name}"? All data will be deleted!', ru: 'Вы уверены, что хотите удалить рабочую область "{name}"? Все данные будут удалены!' },
  loginSuccess: { en: 'Login Successful', ru: 'Вход выполнен' },
  loginViewModeDesc: { en: 'You have entered the workspace in view mode', ru: 'Вы вошли в рабочую область в режиме просмотра' },
  loginWorkspaceFailed: { en: 'Failed to enter workspace', ru: 'Не удалось войти в рабочую область' },
  fillRequiredFields: { en: 'Fill in all required fields', ru: 'Заполните все обязательные поля' },
  logoutFailed: { en: 'Failed to logout', ru: 'Не удалось выйти из системы' },

  // Login
  loginOrEmailRequired: { en: 'Login or email is required', ru: 'Логин или email обязателен' },

  invalidCredentials: { en: 'Invalid credentials', ru: 'Неверные учетные данные' },
  invalidCredentialsMessage: { en: 'Invalid credentials. Please check your login and password.', ru: 'Неверные учетные данные. Пожалуйста, проверьте логин и пароль.' },
  loginFailedMessage: { en: 'Login failed. Please check your credentials.', ru: 'Ошибка входа. Пожалуйста, проверьте учетные данные.' },
  recruitmentPlatform: { en: 'Recruitment Platform', ru: 'Платформа для рекрутинга' },
  loginOrEmailLabel: { en: 'Login or Email', ru: 'Логин или Email' },
  loginOrEmailPlaceholder: { en: 'Enter login or email', ru: 'Введите логин или email' },

  // Logo
  companyLogoAlt: { en: 'Company Logo', ru: 'Логотип компании' },

  // Documentation


  // Google Calendar
  onlyInterviewerOrAdminCanManage: { en: 'Only the interviewer or administrator can manage this interview', ru: 'Только интервьюер или администратор может управлять этим собеседованием' },
  dateFormatWithTime: { en: "EEEE, MMMM d, yyyy 'at' HH:mm", ru: "EEEE, d MMMM yyyy 'в' HH:mm" },

  // Header
  viewMode: { en: 'View Mode', ru: 'Режим просмотра' },
  returnToPanel: { en: 'Return to Panel', ru: 'Вернуться в панель' },

  // Candidate Card
  candidateNotifiedReschedule: { en: '. Candidate received rescheduling notification.', ru: '. Кандидат получил уведомление о переносе.' },
  resumeDefaultName: { en: 'Resume', ru: 'Резюме' },
};

export type Language = 'en' | 'ru';

export function useLanguage() {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('preferred-language') as Language) || 'ru';
    }
    return 'ru';
  });

  const changeLanguage = (newLanguage: Language) => {
    setLanguage(newLanguage);
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferred-language', newLanguage);
    }
  };

  return { language, changeLanguage };
}

class I18nService {
  private currentLanguage: Language = 'en';
  private listeners: Array<(lang: Language) => void> = [];

  constructor() {
    // Load saved language from localStorage
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('language') as Language;
      if (savedLang && ['en', 'ru'].includes(savedLang)) {
        this.currentLanguage = savedLang;
      }
    }
  }

  getCurrentLanguage(): Language {
    return this.currentLanguage;
  }

  setLanguage(lang: Language): void {
    this.currentLanguage = lang;
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', lang);
    }
    this.listeners.forEach(callback => callback(lang));
  }

  subscribe(callback: (lang: Language) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  t(key: keyof typeof translations): string {
    const translation = translations[key];
    if (!translation) {
      devLog(`Translation missing for key: ${key}`);
      return key.toString();
    }
    return translation[this.currentLanguage] || translation['en'] || key.toString();
  }
}

export const i18n = new I18nService();
export const t = (key: keyof typeof translations) => i18n.t(key);





