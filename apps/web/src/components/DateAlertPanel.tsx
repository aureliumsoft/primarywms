"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Minus } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import {
  alertRoleCheckboxLabel,
  encodeAlertRecipients,
  type AlertRecipientDraft,
} from "@/lib/alert-recipient-selection";

export type DateWhenValue = "BEFORE" | "ON" | "AFTER";
export type DateOffsetUnitValue = "DAYS" | "WEEKS" | "MONTHS" | "YEARS";

export type DateAlertDraft = AlertRecipientDraft & {
  dateWhen: DateWhenValue;
  dateOffset: number;
  dateOffsetUnit: DateOffsetUnitValue;
  peopleOpen: boolean;
};

export const DEFAULT_DATE_ALERT: DateAlertDraft = {
  dateWhen: "BEFORE",
  dateOffset: 1,
  dateOffsetUnit: "DAYS",
  self: true,
  customRoles: false,
  owners: false,
  admins: false,
  teamMembers: false,
  scanners: false,
  customRoleIds: [],
  peopleOpen: true,
  peopleIds: [],
};

type OrgRole = { id: string; name: string; kind: string; memberCount: number };
type OrgMember = {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  role: { id: string; name: string; kind: string };
};

const WHEN_OPTIONS: { value: DateWhenValue; label: string }[] = [
  { value: "BEFORE", label: "Before" },
  { value: "ON", label: "On the same date" },
  { value: "AFTER", label: "After" },
];

const UNIT_OPTIONS: { value: DateOffsetUnitValue; label: string }[] = [
  { value: "DAYS", label: "Days" },
  { value: "WEEKS", label: "Weeks" },
  { value: "MONTHS", label: "Months" },
  { value: "YEARS", label: "Years" },
];

export function recipientKindFromDraft(draft: DateAlertDraft) {
  return encodeAlertRecipients(draft).recipientKind;
}

export function recipientIdsFromDraft(draft: DateAlertDraft) {
  return encodeAlertRecipients(draft).recipientIds;
}

export function DateAlertPanel({
  fieldName,
  dateLabel,
  value,
  onChange,
  recipientsOnly,
}: {
  fieldName: string;
  dateLabel: string;
  value: DateAlertDraft;
  onChange: (next: DateAlertDraft) => void;
  recipientsOnly?: boolean;
}) {
  const [whenOpen, setWhenOpen] = useState(false);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [roles, setRoles] = useState<OrgRole[]>([]);
  const [me, setMe] = useState<{ id: string; firstName: string; lastName: string } | null>(null);
  const [timezone, setTimezone] = useState("Europe/London");
  const whenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<{
      members: OrgMember[];
      roles: OrgRole[];
      me: { id: string; firstName: string; lastName: string };
      timezone?: string;
    }>("/api/v1/settings/lookups")
      .then((d) => {
        setMembers(d.members ?? []);
        setRoles(d.roles ?? []);
        setMe(d.me ?? null);
        if (d.timezone) setTimezone(d.timezone);
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!whenRef.current?.contains(e.target as Node)) setWhenOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const byKind = useMemo(() => {
    const superAdmin = roles.find((role) => role.kind === "SUPER_ADMIN");
    const admin = roles.find((role) => role.kind === "ADMIN");
    const team = roles.find((role) => role.kind === "TEAM_MEMBER");
    const scanner = roles.find((role) => role.kind === "SCANNER");
    const custom = roles.filter((role) => role.kind === "CUSTOM");
    return { superAdmin, admin, team, scanner, custom };
  }, [roles]);

  const whenLabel = WHEN_OPTIONS.find((o) => o.value === value.dateWhen)?.label ?? "Before";
  const prettyDate = /^\d{4}-\d{2}-\d{2}$/.test(dateLabel)
    ? `${dateLabel.slice(8, 10)}/${dateLabel.slice(5, 7)}/${dateLabel.slice(0, 4)}`
    : dateLabel;
  const selfName = me ? `${me.firstName} ${me.lastName}`.trim() : "";
  const sendAt = `Alert will be sent at 08:00 (${tzAbbrev(timezone)})`;

  return (
    <div className="mt-3 rounded-lg border border-[#e6ebe8] bg-[#f7f8f8] px-4 py-4">
      {!recipientsOnly ? (
        <>
      <p className="text-[13px] text-[#6b7c74]">
        {fieldName}: <span className="font-medium text-[#2a3a33]">{prettyDate}</span>
      </p>
      <p className="mt-3 text-[13px] text-[#6b7c74]">Alert me:</p>
      <div ref={whenRef} className="relative mt-1.5">
        <button
          type="button"
          onClick={() => setWhenOpen((v) => !v)}
          className="flex h-11 w-full items-center justify-between rounded-md border border-[#b7c2bc] bg-white px-3 text-left text-[14px] text-[#2a3a33]"
        >
          {whenLabel}
          <ChevronDown className="h-4 w-4 text-[#8a9a93]" />
        </button>
        {whenOpen ? (
          <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-[#e6ebe8] bg-white py-1 shadow-lg">
            {WHEN_OPTIONS.map((option) => {
              const selected = option.value === value.dateWhen;
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ ...value, dateWhen: option.value });
                      setWhenOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between px-3 py-2.5 text-left text-[14px] text-[#2a3a33]",
                      selected ? "bg-[#eef1ef]" : "hover:bg-[#f7f8f8]",
                    )}
                  >
                    {option.label}
                    {selected ? <Check className="h-4 w-4 text-[#6b7c74]" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      {value.dateWhen !== "ON" ? (
        <div className="mt-3 flex gap-2">
          <input
            type="number"
            min={1}
            value={value.dateOffset}
            onChange={(e) => onChange({ ...value, dateOffset: Math.max(1, Number(e.target.value) || 1) })}
            className="h-11 w-20 rounded-md border border-[#b7c2bc] bg-white px-3 text-sm outline-none focus:border-primary"
          />
          <select
            value={value.dateOffsetUnit}
            onChange={(e) => onChange({ ...value, dateOffsetUnit: e.target.value as DateOffsetUnitValue })}
            className="h-11 flex-1 rounded-md border border-[#b7c2bc] bg-white px-3 text-sm outline-none focus:border-primary"
          >
            {UNIT_OPTIONS.map((unit) => (
              <option key={unit.value} value={unit.value}>
                {unit.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
        </>
      ) : null}

      <div className="mt-4 flex items-start justify-between gap-4">
        <p className="text-[13px] text-[#6b7c74]">This alert will be sent to:</p>
        {!recipientsOnly ? <p className="text-right text-[13px] text-[#8a9a93]">{sendAt}</p> : null}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2">
        <CheckRow
          label={selfName ? `Self (${selfName})` : "Self"}
          hint={countHint(1)}
          checked={value.self}
          onChange={(self) => onChange({ ...value, self })}
        />
        <CheckRow
          label="Custom Roles"
          hint={countHint(byKind.custom.reduce((sum, role) => sum + role.memberCount, 0), byKind.custom.length ? `${byKind.custom.length} roles` : "none yet")}
          checked={value.customRoles}
          onChange={(customRoles) =>
            onChange({
              ...value,
              customRoles,
              customRoleIds: customRoles ? byKind.custom.map((role) => role.id) : [],
            })
          }
        />
        <CheckRow
          label={byKind.superAdmin ? alertRoleCheckboxLabel(byKind.superAdmin) : "Owners"}
          hint={countHint(byKind.superAdmin?.memberCount ?? 0)}
          checked={value.owners}
          disabled={!byKind.superAdmin}
          onChange={(owners) => onChange({ ...value, owners })}
        />
        <CheckRow
          label={byKind.admin ? alertRoleCheckboxLabel(byKind.admin) : "Admins"}
          hint={countHint(byKind.admin?.memberCount ?? 0)}
          checked={value.admins}
          disabled={!byKind.admin}
          onChange={(admins) => onChange({ ...value, admins })}
        />
        <CheckRow
          label={byKind.team ? alertRoleCheckboxLabel(byKind.team) : "Team Members"}
          hint={countHint(byKind.team?.memberCount ?? 0)}
          checked={value.teamMembers}
          disabled={!byKind.team}
          onChange={(teamMembers) => onChange({ ...value, teamMembers })}
        />
        {byKind.scanner ? (
          <CheckRow
            label={alertRoleCheckboxLabel(byKind.scanner)}
            hint={countHint(byKind.scanner.memberCount)}
            checked={value.scanners}
            onChange={(scanners) => onChange({ ...value, scanners })}
          />
        ) : null}
      </div>

      {value.customRoles ? (
        <div className="mt-3 rounded-md border border-[#d8dfdb] bg-white px-4 py-3">
          <p className="text-[13px] font-medium text-[#2a3a33]">Custom roles</p>
          {byKind.custom.length ? (
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2">
              {byKind.custom.map((role) => {
                const checked = value.customRoleIds.includes(role.id);
                return (
                  <CheckRow
                    key={role.id}
                    label={role.name}
                    hint={countHint(role.memberCount)}
                    checked={checked}
                    onChange={(on) => {
                      const customRoleIds = on
                        ? [...value.customRoleIds, role.id]
                        : value.customRoleIds.filter((id) => id !== role.id);
                      onChange({
                        ...value,
                        customRoleIds,
                        customRoles: customRoleIds.length > 0,
                      });
                    }}
                  />
                );
              })}
            </div>
          ) : (
            <p className="mt-2 text-[13px] text-[#8a9a93]">
              No custom roles in this workspace yet. Add one in Settings → Manage Team and it will show up here.
            </p>
          )}
        </div>
      ) : null}

      {value.peopleOpen ? (
        <div className="relative mt-4 rounded-md border border-[#d8dfdb] bg-white px-4 pb-4 pt-3">
          <p className="pr-8 text-[13px] font-medium text-[#2a3a33]">Select People Manually</p>
          <button
            type="button"
            aria-label="Hide people picker"
            onClick={() => onChange({ ...value, peopleOpen: false, peopleIds: [] })}
            className="absolute right-3 top-3 text-primary hover:text-primary-hover"
          >
            <Minus className="h-4 w-4" strokeWidth={3} />
          </button>
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2">
            {members.length ? (
              members.map((person) => {
                const checked = value.peopleIds.includes(person.id);
                const name = `${person.firstName} ${person.lastName}`.trim() || "Unnamed";
                return (
                  <CheckRow
                    key={person.id}
                    label={name}
                    hint={person.role ? alertRoleCheckboxLabel(person.role) : undefined}
                    checked={checked}
                    onChange={(on) =>
                      onChange({
                        ...value,
                        peopleIds: on ? [...value.peopleIds, person.id] : value.peopleIds.filter((id) => id !== person.id),
                      })
                    }
                  />
                );
              })
            ) : (
              <p className="col-span-2 text-[13px] text-[#8a9a93]">No teammates to select yet.</p>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onChange({ ...value, peopleOpen: true })}
          className="mt-4 text-[13px] font-medium text-primary hover:underline"
        >
          Select People Manually
        </button>
      )}
    </div>
  );
}

function countHint(count: number, extra?: string) {
  const people = count === 1 ? "1 person" : `${count} people`;
  return extra ? `${people} · ${extra}` : people;
}

function tzAbbrev(timezone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, timeZoneName: "short" }).formatToParts(new Date());
    return parts.find((part) => part.type === "timeZoneName")?.value ?? timezone;
  } catch {
    return timezone;
  }
}

function CheckRow({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className={cn("flex items-start gap-2 text-[14px] text-[#2a3a33]", disabled && "opacity-50")}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 accent-primary"
      />
      <span>
        {label}
        {hint ? <span className="block text-[12px] text-[#8a9a93]">{hint}</span> : null}
      </span>
    </label>
  );
}
