import { schedules, logger } from '@trigger.dev/sdk/v3';
import { triageEmails } from '@/lib/ai/agents/operations/email-triage';
import { createServiceClient } from '@/lib/db/client';

export const overnightEmailTriage = schedules.task({
  id: 'overnight-email-triage',
  run: async () => {
    const supabase = createServiceClient();

    // Get all users with connected Gmail and overnight enabled
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: integrations, error } = await (supabase as any)
      .from('user_integrations')
      .select('user_id, account_email')
      .eq('provider', 'gmail')
      .eq('status', 'connected') as {
      data: Array<{ user_id: string; account_email: string | null }> | null;
      error: Error | null;
    };

    if (error) {
      logger.error('Failed to fetch Gmail integrations', { error });
      throw error;
    }

    if (!integrations || integrations.length === 0) {
      logger.info('No connected Gmail integrations found');
      return { usersProcessed: 0 };
    }

    let usersProcessed = 0;
    let totalTasksCreated = 0;

    for (const integration of integrations) {
      const userId = integration.user_id;

      try {
        // Check if user has overnight enabled
        const { data: config } = await supabase
          .from('user_operations_config')
          .select('*')
          .eq('user_id', userId)
          .single();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const opsConfig = config as any;
        if (opsConfig && !opsConfig.overnight_enabled) {
          logger.info('Overnight disabled for user', { userId });
          continue;
        }

        // Get user's VIPs and projects for context
        const { data: onboarding } = await supabase
          .from('onboarding_data')
          .select('vip_contacts, active_projects')
          .eq('user_id', userId)
          .single();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const onboardingData = onboarding as any;
        const vipEmails = onboardingData?.vip_contacts ?? [];
        const activeProjects = onboardingData?.active_projects ?? [];
        const userEmail = integration.account_email ?? '';

        const result = await triageEmails(userId, userEmail, vipEmails, activeProjects);

        usersProcessed++;
        totalTasksCreated += result.tasksCreated;

        logger.info('Email triage complete for user', {
          userId,
          emailsScanned: result.emailsScanned,
          tasksCreated: result.tasksCreated,
          errors: result.errors.length,
        });
      } catch (err) {
        logger.error('Email triage failed for user', {
          userId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return { usersProcessed, totalTasksCreated };
  },
});
