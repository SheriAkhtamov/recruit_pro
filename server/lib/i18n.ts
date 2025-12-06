/**
 * Backend i18n utility for server-side translations
 * Supports Russian and English languages
 */

export type Language = 'en' | 'ru';

// Server-side translations dictionary
const translations = {
    // Notifications
    newInterview: {
        en: 'New Interview',
        ru: 'Новое собеседование',
    },
    candidatePassedStage: {
        en: 'Candidate passed the previous stage. Assigned to stage "{stageName}"',
        ru: 'Кандидат прошел предыдущий этап. Назначен на этап "{stageName}"',
    },
    interviewScheduledOn: {
        en: 'Interview scheduled for stage "{stageName}" on {date}',
        ru: 'Назначено собеседование на этапе "{stageName}" на {date}',
    },
    interviewRescheduled: {
        en: 'Interview Rescheduled',
        ru: 'Собеседование перенесено',
    },
    interviewRescheduledTo: {
        en: 'Interview rescheduled to {date}',
        ru: 'Собеседование перенесено на {date}',
    },
    interviewWithCandidateRescheduled: {
        en: 'Interview with {candidateName} rescheduled to {date}',
        ru: 'Собеседование с {candidateName} перенесено на {date}',
    },
    candidateName: {
        en: 'candidate',
        ru: 'кандидатом',
    },

    // Rate limiter messages
    tooManyLoginAttempts: {
        en: 'Too many login attempts. Please try again later.',
        ru: 'Слишком много попыток входа. Попробуйте позже.',
    },
    tooManySuperAdminLoginAttempts: {
        en: 'Too many super admin login attempts. Please try again later.',
        ru: 'Слишком много попыток входа как суперадминистратор. Попробуйте позже.',
    },

    // Email subjects and messages
    interviewNotificationSubject: {
        en: 'New Interview Scheduled',
        ru: 'Назначено новое собеседование',
    },
    interviewReminderSubject: {
        en: 'Interview Reminder',
        ru: 'Напоминание о собеседовании',
    },

    // Error messages
    departmentNameRequired: {
        en: 'Department name is required',
        ru: 'Название отдела обязательно',
    },
    departmentAlreadyExists: {
        en: 'Department with this name already exists',
        ru: 'Отдел с таким названием уже существует',
    },
    departmentNotFound: {
        en: 'Department not found',
        ru: 'Отдел не найден',
    },
    departmentDeletedSuccessfully: {
        en: 'Department deleted successfully',
        ru: 'Отдел успешно удален',
    },

    // Success messages
    candidateCreated: {
        en: 'Candidate created successfully',
        ru: 'Кандидат успешно создан',
    },
    candidateUpdated: {
        en: 'Candidate updated successfully',
        ru: 'Кандидат успешно обновлен',
    },

    // Additional common phrases
    failed: {
        en: 'Failed',
        ru: 'Не удалось',
    },
    success: {
        en: 'Success',
        ru: 'Успешно',
    },
} as const;

type TranslationKey = keyof typeof translations;

/**
 * Translate a key to the specified language
 * @param key Translation key
 * @param lang Language code (default: 'ru')
 * @param params Optional parameters for string interpolation
 */
export function t(
    key: TranslationKey,
    lang: Language = 'ru',
    params?: Record<string, string>
): string {
    let text: string = translations[key]?.[lang] || translations[key]?.['en'] || key;

    // Replace parameters if provided
    if (params) {
        Object.entries(params).forEach(([paramKey, value]) => {
            text = text.replace(`{${paramKey}}`, value);
        });
    }

    return text;
}
