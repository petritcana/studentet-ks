import { describe, expect, it } from "vitest";
import { checkMedia, MAX_VOICE_BYTES, MAX_VOICE_SECONDS } from "@/lib/media";
import { jobFitsStudent, type JobAlertStudent } from "@/lib/job-match";

function student(overrides: Partial<JobAlertStudent> & { program?: string; faculty?: string } = {}): JobAlertStudent {
  return {
    viewer: {
      facultyName: overrides.faculty ?? "Fakulteti i Inxhinierisë Elektrike dhe Kompjuterike",
      programName: overrides.program ?? "Inxhinieri Kompjuterike",
      city: "Prishtinë",
      year: 2,
      level: "bachelor",
    },
    openToWork: overrides.openToWork ?? false,
    desiredRoles: overrides.desiredRoles ?? [],
  };
}

describe("njoftimet e punëve", () => {
  it("njofton studentin kur fusha i përket programit", () => {
    expect(jobFitsStudent({ title: "Praktikant React", field: "Teknologji" }, student())).toBe(true);
  });

  it("nuk njofton kur fusha nuk ka lidhje me programin", () => {
    const law = student({ faculty: "Fakulteti Juridik", program: "Juridik i përgjithshëm" });
    expect(jobFitsStudent({ title: "Praktikant React", field: "Teknologji" }, law)).toBe(false);
    expect(jobFitsStudent({ title: "Asistent ligjor", field: "Drejtësi" }, law)).toBe(true);
  });

  it("njofton kur studenti e ka kërkuar vetë rolin", () => {
    const law = student({ faculty: "Fakulteti Juridik", program: "Juridik", desiredRoles: ["Marketing"] });
    expect(jobFitsStudent({ title: "Asistent", field: "Marketing" }, law)).toBe(true);
  });

  it("shpallja për të gjitha fushat shkon vetëm te kush kërkon punë", () => {
    const job = { title: "Bursë verore", field: "Të gjitha fushat" };
    expect(jobFitsStudent(job, student())).toBe(false);
    expect(jobFitsStudent(job, student({ openToWork: true }))).toBe(true);
  });

  it("rolet shumë të shkurtra nuk përputhen me çdo titull", () => {
    const law = student({ faculty: "Fakulteti Juridik", program: "Juridik", desiredRoles: ["a", "it"] });
    expect(jobFitsStudent({ title: "Praktikant", field: "Teknologji" }, law)).toBe(false);
  });
});

describe("mesazhet e zërit", () => {
  it("pranon WebM dhe MP4 brenda kufijve", () => {
    expect(checkMedia({ type: "video/webm", size: 200_000 }, 12, { voice: true })).toMatchObject({ ok: true });
    expect(checkMedia({ type: "video/mp4", size: 200_000 }, 12, { voice: true })).toMatchObject({ ok: true });
  });

  it("refuzon zërin më të gjatë ose më të rëndë se kufiri", () => {
    expect(checkMedia({ type: "video/webm", size: 1000 }, MAX_VOICE_SECONDS + 5, { voice: true })).toEqual({
      ok: false,
      reason: "duration",
    });
    expect(checkMedia({ type: "video/webm", size: MAX_VOICE_BYTES + 1 }, 10, { voice: true })).toEqual({
      ok: false,
      reason: "size",
    });
  });

  it("një foto nuk kalon si zë", () => {
    expect(checkMedia({ type: "image/png", size: 1000 }, null, { voice: true })).toEqual({ ok: false, reason: "type" });
  });
});
