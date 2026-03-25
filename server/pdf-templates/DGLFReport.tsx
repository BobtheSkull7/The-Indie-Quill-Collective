import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
  },
  header: {
    marginBottom: 24,
    borderBottom: "2 solid #0f766e",
    paddingBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#0f766e",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 11,
    color: "#64748b",
    marginBottom: 6,
  },
  metaInfo: {
    fontSize: 9,
    color: "#64748b",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    marginBottom: 8,
    backgroundColor: "#f0fdf4",
    padding: 7,
    borderLeft: "3 solid #0f766e",
  },
  statsGrid: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 4,
    textAlign: "center",
    border: "1 solid #e2e8f0",
  },
  statNumber: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#0f766e",
  },
  statLabel: {
    fontSize: 8,
    color: "#64748b",
    marginTop: 3,
  },
  row: {
    flexDirection: "row",
    borderBottom: "1 solid #e2e8f0",
    paddingVertical: 5,
  },
  cellHeader: {
    flex: 1,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#475569",
  },
  cell: {
    flex: 1,
    fontSize: 9,
    color: "#334155",
  },
  emptyRow: {
    paddingVertical: 8,
  },
  emptyText: {
    fontSize: 9,
    color: "#94a3b8",
    fontStyle: "italic",
  },
  infoBox: {
    backgroundColor: "#f0fdf4",
    border: "1 solid #bbf7d0",
    borderRadius: 4,
    padding: 10,
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 9,
    color: "#64748b",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#94a3b8",
    borderTop: "1 solid #e2e8f0",
    paddingTop: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#e2e8f0",
    borderRadius: 4,
    marginTop: 4,
  },
  progressFill: {
    height: 8,
    backgroundColor: "#0f766e",
    borderRadius: 4,
  },
});

interface DGLFReportProps {
  reportTitle: string;
  generatedAt: string;
  cohortInfo: {
    label: string;
    studentCount: number;
  };
  tabeAssessments: {
    studentsWithTabe: number;
    baselineTestsCompleted: number;
    postTestsCompleted: number;
    studentsShowingEflGain: number;
  };
  pactTime: {
    familiesParticipating: number;
    totalPactHours: number;
    totalSessions: number;
    avgSessionMinutes: number;
    familyProgress: Array<{
      id: number;
      family_name: string;
      total_pact_minutes: number;
      target_pact_hours: number;
      pact_completion_percent: number;
    }>;
  };
  curriculumProgress: {
    studentsActive: number;
    totalInstructionHours: number;
    avgModuleCompletion: number;
  };
}

export function DGLFReport({
  reportTitle,
  generatedAt,
  cohortInfo,
  tabeAssessments,
  pactTime,
  curriculumProgress,
}: DGLFReportProps) {
  const safeTitle = reportTitle || "DGLF Family Literacy Impact Report";
  const safeCohortLabel = cohortInfo?.label || "Current Cohort";
  const safeCohortCount = cohortInfo?.studentCount ?? 0;

  const tabe = tabeAssessments || { studentsWithTabe: 0, baselineTestsCompleted: 0, postTestsCompleted: 0, studentsShowingEflGain: 0 };
  const pact = pactTime || { familiesParticipating: 0, totalPactHours: 0, totalSessions: 0, avgSessionMinutes: 0, familyProgress: [] };
  const curriculum = curriculumProgress || { studentsActive: 0, totalInstructionHours: 0, avgModuleCompletion: 0 };
  const families = (pact.familyProgress || []).slice(0, 10);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{safeTitle}</Text>
          <Text style={styles.subtitle}>
            The Indie Quill Collective — Family Literacy Grant Compliance Report
          </Text>
          <Text style={styles.metaInfo}>
            Generated: {new Date(generatedAt).toLocaleString()}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cohort Information</Text>
          <View style={styles.statsGrid}>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Active Cohort</Text>
              <Text style={styles.infoValue}>{safeCohortLabel}</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Total Students</Text>
              <Text style={styles.infoValue}>{safeCohortCount}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TABE Assessment Results (EFL Gains)</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{tabe.studentsWithTabe}</Text>
              <Text style={styles.statLabel}>Students Tested</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{tabe.baselineTestsCompleted}</Text>
              <Text style={styles.statLabel}>Baseline Tests</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{tabe.postTestsCompleted}</Text>
              <Text style={styles.statLabel}>Post Tests</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={{ ...styles.statNumber, color: "#16a34a" }}>{tabe.studentsShowingEflGain}</Text>
              <Text style={styles.statLabel}>Showing EFL Gain</Text>
            </View>
          </View>
          {tabe.studentsWithTabe === 0 && (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>No TABE assessment data recorded for this period.</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PACT Time (Parent and Child Together)</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{pact.familiesParticipating}</Text>
              <Text style={styles.statLabel}>Families Participating</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{pact.totalPactHours}</Text>
              <Text style={styles.statLabel}>Total PACT Hours</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{pact.totalSessions}</Text>
              <Text style={styles.statLabel}>Total Sessions</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{pact.avgSessionMinutes}</Text>
              <Text style={styles.statLabel}>Avg Session (min)</Text>
            </View>
          </View>

          {families.length > 0 ? (
            <View>
              <View style={styles.row}>
                <Text style={styles.cellHeader}>Family</Text>
                <Text style={styles.cellHeader}>PACT Minutes</Text>
                <Text style={styles.cellHeader}>Target Hours</Text>
                <Text style={styles.cellHeader}>Completion %</Text>
              </View>
              {families.map((f, i) => (
                <View key={i} style={styles.row}>
                  <Text style={styles.cell}>{f.family_name || "-"}</Text>
                  <Text style={styles.cell}>{f.total_pact_minutes ?? 0}</Text>
                  <Text style={styles.cell}>{f.target_pact_hours ?? 0}</Text>
                  <Text style={styles.cell}>{f.pact_completion_percent ?? 0}%</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>No family PACT time data recorded for this period.</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Curriculum Progress (120-Hour Course)</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{curriculum.studentsActive}</Text>
              <Text style={styles.statLabel}>Active Students</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{curriculum.totalInstructionHours}</Text>
              <Text style={styles.statLabel}>Total Instruction Hours</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={{ ...styles.statNumber, color: curriculum.avgModuleCompletion >= 75 ? "#16a34a" : "#0f766e" }}>
                {curriculum.avgModuleCompletion}%
              </Text>
              <Text style={styles.statLabel}>Avg Module Completion</Text>
            </View>
          </View>
          {curriculum.studentsActive === 0 && (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>No curriculum progress data recorded for this period.</Text>
            </View>
          )}
        </View>

        <Text style={styles.footer}>
          DGLF Impact Report — The Indie Quill Collective 501(c)(3) | theindiequillcollective.com
          {"\n"}Generated for grant compliance and family literacy reporting purposes.
        </Text>
      </Page>
    </Document>
  );
}
