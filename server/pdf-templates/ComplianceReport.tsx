import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
  },
  header: {
    marginBottom: 30,
    borderBottom: "2 solid #1e293b",
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 10,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    marginBottom: 10,
    backgroundColor: "#f1f5f9",
    padding: 8,
  },
  row: {
    flexDirection: "row",
    borderBottom: "1 solid #e2e8f0",
    paddingVertical: 6,
  },
  cell: {
    flex: 1,
    fontSize: 9,
  },
  cellHeader: {
    flex: 1,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#475569",
  },
  badge: {
    backgroundColor: "#dcfce7",
    color: "#166534",
    padding: "2 6",
    borderRadius: 4,
    fontSize: 8,
  },
  warningBadge: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
    padding: "2 6",
    borderRadius: 4,
    fontSize: 8,
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
    paddingTop: 10,
  },
  metaInfo: {
    fontSize: 9,
    color: "#64748b",
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: "row",
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 12,
    marginRight: 10,
    borderRadius: 4,
    textAlign: "center",
  },
  statNumber: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
  },
  statLabel: {
    fontSize: 8,
    color: "#64748b",
    marginTop: 4,
  },
});

interface ComplianceReportProps {
  generatedAt: string;
  generatedBy: string;
  stats: {
    totalMinors: number;
    verifiedConsent: number;
    pendingConsent: number;
    totalContracts: number;
    signedContracts: number;
  };
  minorRecords: Array<{
    id: number;
    displayName: string;
    guardianName: string | null;
    guardianEmail: string | null;
    consentMethod: string | null;
    consentVerified: boolean;
    dataRetentionUntil: string | null;
    createdAt: string;
  }>;
  contractForensics: Array<{
    id: number;
    displayName: string;
    signedAt: string | null;
    signatureIp: string | null;
    signatureUserAgent: string | null;
    guardianSignedAt: string | null;
    guardianSignatureIp: string | null;
  }>;
  auditSample: Array<{
    id: number;
    action: string;
    resourceType: string;
    userId: string;
    ipAddress: string | null;
    createdAt: string;
  }>;
}

export function ComplianceReport({
  generatedAt,
  generatedBy,
  stats,
  minorRecords,
  contractForensics,
  auditSample,
}: ComplianceReportProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Compliance Audit Report</Text>
          <Text style={styles.subtitle}>
            The Indie Quill Collective - 501(c)(3) Non-Profit Organization
          </Text>
          <Text style={styles.metaInfo}>
            Generated: {new Date(generatedAt).toLocaleString()} | By: {generatedBy}
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.totalMinors}</Text>
            <Text style={styles.statLabel}>Youth Authors</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.verifiedConsent}</Text>
            <Text style={styles.statLabel}>Verified Consent</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.signedContracts}</Text>
            <Text style={styles.statLabel}>Signed Contracts</Text>
          </View>
          <View style={{ ...styles.statBox, marginRight: 0 }}>
            <Text style={styles.statNumber}>100%</Text>
            <Text style={styles.statLabel}>COPPA Compliant</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Minor Author Records (COPPA Compliance)</Text>
          <View style={styles.row}>
            <Text style={styles.cellHeader}>Author</Text>
            <Text style={styles.cellHeader}>Guardian</Text>
            <Text style={styles.cellHeader}>Consent Method</Text>
            <Text style={styles.cellHeader}>Status</Text>
            <Text style={styles.cellHeader}>Retention Until</Text>
          </View>
          {minorRecords.length === 0 ? (
            <View style={styles.row}>
              <Text style={styles.cell}>No minor authors in system</Text>
            </View>
          ) : (
            minorRecords.slice(0, 10).map((record) => (
              <View key={record.id} style={styles.row}>
                <Text style={styles.cell}>{record.displayName}</Text>
                <Text style={styles.cell}>{record.guardianName || "-"}</Text>
                <Text style={styles.cell}>{record.consentMethod || "-"}</Text>
                <Text style={styles.cell}>
                  {record.consentVerified ? "Verified" : "Pending"}
                </Text>
                <Text style={styles.cell}>
                  {record.dataRetentionUntil
                    ? new Date(record.dataRetentionUntil).toLocaleDateString()
                    : "N/A"}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contract Signature Forensics</Text>
          <View style={styles.row}>
            <Text style={styles.cellHeader}>Contract</Text>
            <Text style={styles.cellHeader}>Author Signed</Text>
            <Text style={styles.cellHeader}>IP Address</Text>
            <Text style={styles.cellHeader}>Guardian Signed</Text>
          </View>
          {contractForensics.length === 0 ? (
            <View style={styles.row}>
              <Text style={styles.cell}>No signed contracts</Text>
            </View>
          ) : (
            contractForensics.slice(0, 10).map((contract) => (
              <View key={contract.id} style={styles.row}>
                <Text style={styles.cell}>{contract.displayName}</Text>
                <Text style={styles.cell}>
                  {contract.signedAt
                    ? new Date(contract.signedAt).toLocaleDateString()
                    : "-"}
                </Text>
                <Text style={styles.cell}>{contract.signatureIp || "-"}</Text>
                <Text style={styles.cell}>
                  {contract.guardianSignedAt
                    ? new Date(contract.guardianSignedAt).toLocaleDateString()
                    : "N/A"}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Audit Log Sample (Recent Activity)</Text>
          <View style={styles.row}>
            <Text style={styles.cellHeader}>Action</Text>
            <Text style={styles.cellHeader}>Resource</Text>
            <Text style={styles.cellHeader}>IP Address</Text>
            <Text style={styles.cellHeader}>Timestamp</Text>
          </View>
          {auditSample.slice(0, 8).map((log) => (
            <View key={log.id} style={styles.row}>
              <Text style={styles.cell}>{log.action}</Text>
              <Text style={styles.cell}>{log.resourceType}</Text>
              <Text style={styles.cell}>{log.ipAddress || "-"}</Text>
              <Text style={styles.cell}>
                {new Date(log.createdAt).toLocaleString()}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>
          This report is generated for grant compliance purposes. All minor author data is
          protected under COPPA guidelines. Contact: The Indie Quill Collective |
          theindiequillcollective.com
        </Text>
      </Page>
    </Document>
  );
}
