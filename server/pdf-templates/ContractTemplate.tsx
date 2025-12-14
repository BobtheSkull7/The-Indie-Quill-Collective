import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontFamily: "Helvetica",
    fontSize: 11,
    lineHeight: 1.5,
  },
  header: {
    textAlign: "center",
    marginBottom: 30,
  },
  orgName: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#0f766e",
  },
  orgSubtitle: {
    fontSize: 10,
    color: "#64748b",
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
    textAlign: "center",
  },
  contractDate: {
    fontSize: 10,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 30,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#1e293b",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: 140,
    fontWeight: "bold",
    color: "#475569",
  },
  value: {
    flex: 1,
    color: "#1e293b",
  },
  contractContent: {
    marginBottom: 30,
    textAlign: "justify",
  },
  signatureSection: {
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 20,
  },
  signatureBlock: {
    marginBottom: 25,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    borderBottomStyle: "dashed",
  },
  signatureTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#1e293b",
  },
  signatureLine: {
    flexDirection: "row",
    marginBottom: 4,
  },
  signatureLabel: {
    width: 100,
    fontSize: 10,
    color: "#64748b",
  },
  signatureValue: {
    flex: 1,
    fontSize: 11,
    color: "#1e293b",
    fontStyle: "italic",
  },
  signedStatus: {
    color: "#059669",
    fontWeight: "bold",
  },
  pendingStatus: {
    color: "#d97706",
    fontStyle: "italic",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 50,
    right: 50,
    textAlign: "center",
    fontSize: 9,
    color: "#94a3b8",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
  },
  minorNotice: {
    backgroundColor: "#fef3c7",
    padding: 10,
    marginBottom: 20,
    borderRadius: 4,
  },
  minorNoticeText: {
    fontSize: 10,
    color: "#92400e",
  },
});

interface ContractData {
  id: number;
  contractType: string;
  contractContent: string;
  authorSignature: string | null;
  authorSignedAt: string | null;
  guardianSignature: string | null;
  guardianSignedAt: string | null;
  requiresGuardian: boolean;
  status: string;
  createdAt: string;
}

interface ApplicationData {
  penName: string | null;
  dateOfBirth: string;
  isMinor: boolean;
  guardianName: string | null;
  guardianEmail: string | null;
  guardianRelationship: string | null;
}

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
}

interface ContractPDFProps {
  contract: ContractData;
  application: ApplicationData;
  user: UserData;
}

const formatDate = (dateString: string | null): string => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatDateTime = (dateString: string | null): string => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function ContractPDF({ contract, application, user }: ContractPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.orgName}>The Indie Quill Collective</Text>
          <Text style={styles.orgSubtitle}>A 501(c)(3) Non-Profit Organization Supporting Emerging Authors</Text>
        </View>

        <Text style={styles.title}>
          {contract.contractType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
        </Text>
        <Text style={styles.contractDate}>
          Contract ID: {contract.id} | Created: {formatDate(contract.createdAt)}
        </Text>

        {application.isMinor && (
          <View style={styles.minorNotice}>
            <Text style={styles.minorNoticeText}>
              Note: This contract involves a minor author and requires guardian consent.
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Author Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Full Name:</Text>
            <Text style={styles.value}>{user.firstName} {user.lastName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{user.email}</Text>
          </View>
          {application.penName && (
            <View style={styles.row}>
              <Text style={styles.label}>Pen Name:</Text>
              <Text style={styles.value}>{application.penName}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Date of Birth:</Text>
            <Text style={styles.value}>{application.dateOfBirth}</Text>
          </View>
        </View>

        {application.isMinor && application.guardianName && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Guardian Information</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Guardian Name:</Text>
              <Text style={styles.value}>{application.guardianName}</Text>
            </View>
            {application.guardianEmail && (
              <View style={styles.row}>
                <Text style={styles.label}>Guardian Email:</Text>
                <Text style={styles.value}>{application.guardianEmail}</Text>
              </View>
            )}
            {application.guardianRelationship && (
              <View style={styles.row}>
                <Text style={styles.label}>Relationship:</Text>
                <Text style={styles.value}>{application.guardianRelationship}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contract Terms</Text>
          <Text style={styles.contractContent}>{contract.contractContent}</Text>
        </View>

        <View style={styles.signatureSection}>
          <Text style={styles.sectionTitle}>Signatures</Text>

          <View style={styles.signatureBlock}>
            <Text style={styles.signatureTitle}>Author Signature</Text>
            <View style={styles.signatureLine}>
              <Text style={styles.signatureLabel}>Signature:</Text>
              {contract.authorSignature ? (
                <Text style={styles.signatureValue}>{contract.authorSignature}</Text>
              ) : (
                <Text style={[styles.signatureValue, styles.pendingStatus]}>Awaiting signature</Text>
              )}
            </View>
            <View style={styles.signatureLine}>
              <Text style={styles.signatureLabel}>Date Signed:</Text>
              {contract.authorSignedAt ? (
                <Text style={[styles.signatureValue, styles.signedStatus]}>{formatDateTime(contract.authorSignedAt)}</Text>
              ) : (
                <Text style={[styles.signatureValue, styles.pendingStatus]}>Pending</Text>
              )}
            </View>
          </View>

          {contract.requiresGuardian && (
            <View style={styles.signatureBlock}>
              <Text style={styles.signatureTitle}>Guardian Signature (Required for Minor)</Text>
              <View style={styles.signatureLine}>
                <Text style={styles.signatureLabel}>Signature:</Text>
                {contract.guardianSignature ? (
                  <Text style={styles.signatureValue}>{contract.guardianSignature}</Text>
                ) : (
                  <Text style={[styles.signatureValue, styles.pendingStatus]}>Awaiting signature</Text>
                )}
              </View>
              <View style={styles.signatureLine}>
                <Text style={styles.signatureLabel}>Date Signed:</Text>
                {contract.guardianSignedAt ? (
                  <Text style={[styles.signatureValue, styles.signedStatus]}>{formatDateTime(contract.guardianSignedAt)}</Text>
                ) : (
                  <Text style={[styles.signatureValue, styles.pendingStatus]}>Pending</Text>
                )}
              </View>
            </View>
          )}
        </View>

        <Text style={styles.footer}>
          The Indie Quill Collective | www.theindiequillcollective.org | Document generated on {new Date().toLocaleDateString()}
        </Text>
      </Page>
    </Document>
  );
}
