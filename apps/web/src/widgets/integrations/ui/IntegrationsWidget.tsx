/**
 * Integrations widget — the state of every external system the project
 * can talk to.
 *
 * The states are reported honestly: a system whose access has not been
 * granted says so and lists what is missing, rather than pretending
 * to be connected.
 */

import type { IntegrationDescriptor, IntegrationState } from '@t2-sales-hub/core';
import { Badge, Card, CardContent, Icon, type IconName } from '@t2-sales-hub/ui';

export interface IntegrationsWidgetProps {
  integrations: IntegrationDescriptor[];
}

const STATE_LABEL: Record<IntegrationState, string> = {
  'not-configured': 'не настроена',
  checking: 'проверка',
  available: 'подключена',
  unauthorized: 'нет доступа',
  unavailable: 'недоступна',
  error: 'ошибка',
};

const STATE_VARIANT: Record<
  IntegrationState,
  'default' | 'success' | 'warning' | 'danger' | 'info'
> = {
  'not-configured': 'default',
  checking: 'info',
  available: 'success',
  unauthorized: 'warning',
  unavailable: 'danger',
  error: 'danger',
};

const SYSTEM_ICON: Record<string, IconName> = {
  'google-sheets': 'file-text',
  'abc-t2': 'plug',
  onec: 'wallet',
};

export function IntegrationsWidget({ integrations }: IntegrationsWidgetProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {integrations.map((integration) => (
        <Card key={integration.kind} variant="default" className="flex flex-col">
          <CardContent className="flex h-full flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <span
                  className={
                    integration.state === 'available'
                      ? 'flex h-10 w-10 items-center justify-center rounded-xl bg-lime-500/20 text-ink-900'
                      : 'flex h-10 w-10 items-center justify-center rounded-xl bg-background-tertiary text-text-tertiary'
                  }
                  aria-hidden="true"
                >
                  <Icon name={SYSTEM_ICON[integration.kind] ?? 'plug'} size="md" />
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-text-primary">
                    {integration.displayName}
                  </span>
                  <span className="text-xs text-text-tertiary">{integration.purpose}</span>
                </div>
              </div>
            </div>

            <Badge variant={STATE_VARIANT[integration.state]} size="sm" dot className="self-start">
              {STATE_LABEL[integration.state]}
            </Badge>

            {integration.missingRequirements.length > 0 && (
              <ul className="flex flex-col gap-1.5 border-t border-border-secondary pt-3">
                {integration.missingRequirements.map((requirement) => (
                  <li
                    key={requirement}
                    className="flex items-start gap-2 text-xs leading-relaxed text-text-tertiary"
                  >
                    <Icon
                      name="chevron-right"
                      size="sm"
                      className="mt-0.5 shrink-0 text-text-muted"
                    />
                    {requirement}
                  </li>
                ))}
              </ul>
            )}

            {integration.lastCheckedAt && (
              <p className="mt-auto pt-2 text-[0.6875rem] text-text-muted">
                Проверено{' '}
                {new Date(integration.lastCheckedAt).toLocaleString('ru-RU', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
