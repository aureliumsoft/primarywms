"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  PrimaryAddButton,
  SettingsAddRow,
  SettingsEmpty,
  SettingsField,
  SettingsPage,
  SettingsTable,
  SettingsTh,
  settingsInputClass,
} from "@/components/settings/ui";
import { Modal } from "@/components/ui";

type Unit = { id: string; name: string; abbreviation: string; type: string; isDefault: boolean; isSystem: boolean };

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [type, setType] = useState("COUNT");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function load() {
    api<{ units: Unit[] }>("/api/v1/settings/lookups").then((d) => setUnits(d.units));
  }

  useEffect(load, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");
    try {
      const res = await api<{ unit: Unit }>("/api/v1/settings/units", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), abbreviation: abbreviation.trim(), type }),
      });
      setUnits((prev) => [...prev, res.unit]);
      setOpen(false);
      setName("");
      setAbbreviation("");
      setType("COUNT");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add unit");
    } finally {
      setPending(false);
    }
  }

  return (
    <SettingsPage
      title="Units of Measure"
      subtitle="View system-provided units and create custom units to suit your inventory needs."
      actions={<PrimaryAddButton onClick={() => setOpen(true)}>+ Add Custom Unit</PrimaryAddButton>}
      wide
    >
      <SettingsTable>
        <thead className="border-b border-[#e6ebe8] bg-[#fafbfa]">
          <tr>
            <SettingsTh>Unit name</SettingsTh>
            <SettingsTh>Abbreviation</SettingsTh>
            <SettingsTh>Type</SettingsTh>
          </tr>
        </thead>
        <tbody>
          {units.map((unit) => (
            <tr key={unit.id} className="border-b border-[#eef2f0]">
              <td className="px-4 py-3 font-medium text-[#1c2b25]">
                {unit.name}
                {unit.isDefault ? (
                  <span className="ml-2 rounded bg-[#eef2f0] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#6b7c74]">
                    Default
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-3 text-[#6b7c74]">{unit.abbreviation}</td>
              <td className="px-4 py-3 capitalize text-[#6b7c74]">{unit.type.toLowerCase()}</td>
            </tr>
          ))}
        </tbody>
      </SettingsTable>
      <SettingsAddRow label="Add Custom Unit" onClick={() => setOpen(true)} />
      {units.length === 0 ? <SettingsEmpty message="No units yet." /> : null}

      <Modal open={open} title="Add Custom Unit" onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="space-y-4">
          <SettingsField label="Unit name">
            <input className={settingsInputClass()} value={name} onChange={(e) => setName(e.target.value)} required />
          </SettingsField>
          <SettingsField label="Abbreviation">
            <input className={settingsInputClass()} value={abbreviation} onChange={(e) => setAbbreviation(e.target.value)} required />
          </SettingsField>
          <SettingsField label="Type">
            <select className={settingsInputClass()} value={type} onChange={(e) => setType(e.target.value)}>
              <option value="COUNT">Count</option>
              <option value="WEIGHT">Weight</option>
              <option value="LENGTH">Length</option>
              <option value="VOLUME">Volume</option>
            </select>
          </SettingsField>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="h-10 rounded-md px-4 text-[13px] text-[#6b7c74]" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <PrimaryAddButton type="submit">{pending ? "Adding…" : "Add unit"}</PrimaryAddButton>
          </div>
        </form>
      </Modal>
    </SettingsPage>
  );
}
