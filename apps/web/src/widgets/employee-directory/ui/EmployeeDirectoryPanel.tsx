/**
 * The employee directory in the administrator's page.
 *
 * The administrator issues the PINs, deactivates the people who left
 * and reads the access log. The PIN is shown once and never again —
 * only its hash is stored.
 */

import { useCallback, useEffect, useState } from 'react';

import type { UserRole } from '@t2-sales-hub/core';
import { Badge, Button, Card, Icon, Input } from '@t2-sales-hub/ui';
import {
  listEmployees,
  listAccessLog,
  saveEmployee,
  setEmployeeActive,
  resetEmployeePin,
  removeEmployee,
  type AccessRecord,
  type EmployeeSummary,
} from '@/shared/api/directory';

const ROLE_LABELS: Record<UserRole, string> = {
  seller: 'продавец',
  curator: 'куратор',
  manager: 'руководитель',
  admin: 'администратор',
};

export function EmployeeDirectoryPanel() {
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [records, setRecords] = useState<AccessRecord[]>([]);
  const [name, setName] = useState('');
  const [office, setOffice] = useState('');
  const [position, setPosition] = useState('');
  const [role, setRole] = useState<UserRole>('seller');
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    const [loadedEmployees, loadedRecords] = await Promise.all([listEmployees(), listAccessLog()]);
    setEmployees(loadedEmployees);
    setRecords(loadedRecords);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    setMessage(null);

    try {
      const result = await saveEmployee({
        id: `EMP-${String(employees.length + 1).padStart(3, '0')}`,
        name: name.trim(),
        office: office.trim() || undefined,
        position: position.trim() || undefined,
        roles: [role],
      });

      setMessage(
        result.generatedPin
          ? `ПИН для ${result.employee?.name}: ${result.generatedPin} — запишите его сейчас, он больше не показывается.`
          : 'Сотрудник сохранён.'
      );
      setName('');
      setOffice('');
      setPosition('');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось сохранить сотрудника.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPin = async (employee: EmployeeSummary) => {
    setMessage(null);
    try {
      const result = await resetEmployeePin(employee.id);
      setMessage(
        result.generatedPin
          ? `Новый ПИН для ${employee.name}: ${result.generatedPin}`
          : 'ПИН сброшен.'
      );
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось сбросить ПИН.');
    }
  };

  const handleToggle = async (employee: EmployeeSummary) => {
    await setEmployeeActive(employee.id, !employee.active);
    await load();
  };

  const handleRemove = async (employee: EmployeeSummary) => {
    await removeEmployee(employee.id);
    await load();
  };

  return (
    <div className="flex flex-col gap-4">
      <Card variant="outlined" className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Сотрудники с доступом
          </p>
          <Badge variant="outline" size="sm">
            {employees.length}
          </Badge>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-4">
          <Input
            label="Фамилия и имя"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Иванова Пётр Петрович"
          />
          <Input
            label="Торговая точка"
            value={office}
            onChange={(event) => setOffice(event.target.value)}
            placeholder="Карла Маркса, 7"
          />
          <Input
            label="Должность"
            value={position}
            onChange={(event) => setPosition(event.target.value)}
            placeholder="Продавец-консультант"
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">Роль</span>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as UserRole)}
              className="rounded-xl border border-border-secondary bg-background-tertiary px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-500"
            >
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={() => void handleAdd()}
            disabled={isSaving || !name.trim()}
            variant="primary"
          >
            <Icon name="user" size="sm" />
            Добавить и выдать ПИН
          </Button>
          {message && (
            <p className="text-xs leading-relaxed text-text-secondary" role="status">
              {message}
            </p>
          )}
        </div>
      </Card>

      <Card variant="outlined" className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Список</p>
        <ul className="mt-3 flex flex-col gap-2">
          {employees.length === 0 && <li className="text-xs text-text-muted">Справочник пуст.</li>}
          {employees.map((employee) => (
            <li
              key={employee.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-background-tertiary px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {employee.name}
                  {employee.position ? ` · ${employee.position}` : ''}
                </p>
                <p className="truncate text-[0.6875rem] text-text-muted">
                  {employee.office ?? 'без торговой точки'}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <Badge variant={employee.active ? 'lime' : 'outline'} size="sm" dot>
                  {employee.roles.map((item) => ROLE_LABELS[item]).join(', ')}
                </Badge>
                <button
                  type="button"
                  onClick={() => void handleToggle(employee)}
                  className="rounded-lg border border-border-secondary px-2 py-1 text-[0.6875rem] transition-colors hover:bg-background-card"
                >
                  {employee.active ? 'Отключить' : 'Включить'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleResetPin(employee)}
                  className="rounded-lg border border-border-secondary px-2 py-1 text-[0.6875rem] transition-colors hover:bg-background-card"
                >
                  Сбросить ПИН
                </button>
                <button
                  type="button"
                  onClick={() => void handleRemove(employee)}
                  className="rounded-lg border border-border-secondary px-2 py-1 text-[0.6875rem] text-danger-600 transition-colors hover:bg-danger-bg"
                >
                  Удалить
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card variant="outlined" className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Журнал входов
          </p>
          <Badge variant="outline" size="sm">
            {records.length}
          </Badge>
        </div>

        <ul className="mt-3 flex max-h-64 flex-col gap-1.5 overflow-y-auto">
          {records.length === 0 && <li className="text-xs text-text-muted">Записей пока нет.</li>}
          {records.slice(0, 40).map((record, index) => (
            <li
              key={`${record.at}-${index}`}
              className="flex items-center justify-between gap-3 rounded-lg bg-background-tertiary px-2.5 py-1.5 text-[0.6875rem]"
            >
              <span className="truncate">
                {record.identifier || '—'}
                {record.ip ? ` · ${record.ip}` : ''}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {record.role && <span className="text-text-muted">{record.role}</span>}
                <Badge variant={record.success ? 'lime' : 'outline'} size="sm">
                  {record.success ? 'вход' : (record.reason ?? 'отказ')}
                </Badge>
                <span className="text-text-muted">
                  {new Date(record.at).toLocaleString('ru-RU')}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
