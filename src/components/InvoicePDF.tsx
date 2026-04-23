import { Document, Page, Text, View, StyleSheet, pdf, Image } from "@react-pdf/renderer";

// Import the pharmacy logo
const pharmacyLogo = "/pharmacy-logo.png";

// Define styles
const styles = StyleSheet.create({
  page: {
    padding: 25,
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },
  // Professional Header Styles
  headerContainer: {
    marginBottom: 15,
    borderWidth: 2,
    borderColor: "#0066cc",
    borderRadius: 4,
  },
  headerTop: {
    backgroundColor: "#0066cc",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    width: 50,
    height: 50,
    marginRight: 12,
  },
  logo: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
  headerTextContainer: {
    alignItems: "center",
  },
  pharmacyName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  pharmacyTagline: {
    fontSize: 8,
    color: "#cce0ff",
    marginTop: 2,
  },
  headerBottom: {
    backgroundColor: "#f0f7ff",
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerInfoLeft: {
    flex: 1,
  },
  headerInfoRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  pharmacyInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  infoIcon: {
    fontSize: 10,
    marginRight: 5,
    color: "#0066cc",
  },
  infoText: {
    fontSize: 9,
    color: "#333",
  },
  infoLabel: {
    fontSize: 9,
    color: "#0066cc",
    fontWeight: "bold",
  },
  invoiceTitleSection: {
    backgroundColor: "#0066cc",
    paddingVertical: 6,
    paddingHorizontal: 15,
    marginBottom: 12,
    alignItems: "center",
    borderRadius: 2,
  },
  invoiceTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  invoiceToSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  invoiceToLeft: {
    width: "55%",
    backgroundColor: "#f9f9f9",
    padding: 10,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: "#0066cc",
  },
  invoiceToRight: {
    width: "40%",
    backgroundColor: "#f9f9f9",
    padding: 10,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: "#28a745",
  },
  invoiceToTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#0066cc",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  invoiceToInfo: {
    fontSize: 9,
    color: "#374151",
    marginBottom: 3,
  },
  invoiceNumber: {
    fontSize: 9,
    color: "#374151",
    marginBottom: 3,
  },
  invoiceNumberLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#28a745",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
    backgroundColor: "#f3f4f6",
    padding: 6,
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: "35%",
    color: "#666",
    fontSize: 9,
  },
  value: {
    width: "65%",
    fontSize: 9,
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#0066cc",
    padding: 8,
    color: "white",
    fontWeight: "bold",
    fontSize: 9,
  },
  tableRow: {
    flexDirection: "row",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    fontSize: 9,
  },
  tableRowAlt: {
    backgroundColor: "#f9fafb",
  },
  col1: { width: "8%", textAlign: "center" },
  col2: { width: "32%" },
  col3: { width: "12%", textAlign: "center" },
  col4: { width: "15%", textAlign: "right" },
  col5: { width: "12%", textAlign: "center" },
  col6: { width: "18%", textAlign: "right" },
  summary: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 4,
  },
  summaryLabel: {
    width: "70%",
    textAlign: "right",
    paddingRight: 15,
    color: "#666",
    fontSize: 10,
  },
  summaryValue: {
    width: "30%",
    textAlign: "right",
    fontSize: 10,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: "#0066cc",
  },
  totalLabel: {
    width: "70%",
    textAlign: "right",
    paddingRight: 15,
    fontWeight: "bold",
    fontSize: 12,
  },
  totalValue: {
    width: "30%",
    textAlign: "right",
    fontWeight: "bold",
    fontSize: 12,
    color: "#0066cc",
  },
  footer: {
    position: "absolute",
    bottom: 25,
    left: 25,
    right: 25,
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#0066cc",
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: "#666",
    marginBottom: 2,
  },
  footerThankYou: {
    fontSize: 10,
    color: "#0066cc",
    fontWeight: "bold",
    marginBottom: 4,
  },
  dueAmount: {
    color: "#dc2626",
    fontWeight: "bold",
  },
  paidAmount: {
    color: "#16a34a",
  },
});

export interface InvoiceData {
  invoiceNumber: string;
  date: string;
  pharmacy: {
    name: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    vatNumber?: string | null;
    panNumber?: string | null;
  };
  customer?: {
    name: string;
    phone?: string | null;
    address?: string | null;
  } | null;
  doctorName?: string | null;
  prescriptionRef?: string | null;
  items: {
    name: string;
    batchNumber: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    total: number;
  }[];
  subtotal: number;
  vatAmount: number;
  total: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod: string;
  notes?: string | null;
}

const InvoiceDocument = ({ data }: { data: InvoiceData }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Professional Header */}
      <View style={styles.headerContainer}>
        {/* Top Section - Logo and Pharmacy Name */}
        <View style={styles.headerTop}>
          <View style={styles.logoContainer}>
            <Image style={styles.logo} src={pharmacyLogo} />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.pharmacyName}>{data.pharmacy.name}</Text>
            <Text style={styles.pharmacyTagline}>Mahadeva R.M Baliya - 04 Saptari</Text>
          </View>
        </View>

        {/* Bottom Section - Contact Details */}
        <View style={styles.headerBottom}>
          <View style={styles.headerInfoLeft}>
            {data.pharmacy.phone && (
              <View style={styles.pharmacyInfoRow}>
                <Text style={styles.infoIcon}>📞</Text>
                <Text style={styles.infoText}>{data.pharmacy.phone}</Text>
              </View>
            )}
            {data.pharmacy.email && (
              <View style={styles.pharmacyInfoRow}>
                <Text style={styles.infoIcon}>✉️</Text>
                <Text style={styles.infoText}>{data.pharmacy.email}</Text>
              </View>
            )}
          </View>
          <View style={styles.headerInfoRight}>
            {data.pharmacy.panNumber && (
              <View style={styles.pharmacyInfoRow}>
                <Text style={styles.infoLabel}>PAN: </Text>
                <Text style={styles.infoText}>{data.pharmacy.panNumber}</Text>
              </View>
            )}
            {data.pharmacy.vatNumber && (
              <View style={styles.pharmacyInfoRow}>
                <Text style={styles.infoLabel}>VAT: </Text>
                <Text style={styles.infoText}>{data.pharmacy.vatNumber}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Invoice Title */}
      <View style={styles.invoiceTitleSection}>
        <Text style={styles.invoiceTitle}>Sales Invoice</Text>
      </View>

      {/* Invoice To Section */}
      <View style={styles.invoiceToSection}>
        <View style={styles.invoiceToLeft}>
          <Text style={styles.invoiceToTitle}>Bill To:</Text>
          <Text style={styles.invoiceToInfo}>{data.customer?.name || "Walk-in Customer"}</Text>
          {data.customer?.phone && <Text style={styles.invoiceToInfo}>Phone: {data.customer.phone}</Text>}
          {data.customer?.address && <Text style={styles.invoiceToInfo}>{data.customer.address}</Text>}
          {data.doctorName && <Text style={styles.invoiceToInfo}>Dr. {data.doctorName}</Text>}
        </View>
        <View style={styles.invoiceToRight}>
          <Text style={styles.invoiceNumberLabel}>Invoice Details</Text>
          <Text style={styles.invoiceNumber}>Invoice #: {data.invoiceNumber}</Text>
          <Text style={styles.invoiceNumber}>Date: {data.date}</Text>
          <Text style={styles.invoiceNumber}>Payment: {data.paymentMethod.toUpperCase()}</Text>
        </View>
      </View>

      {/* Items Table */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.col1}>S.N</Text>
          <Text style={styles.col2}>Medicine / Item</Text>
          <Text style={styles.col3}>Qty</Text>
          <Text style={styles.col4}>Unit Price</Text>
          <Text style={styles.col6}>Amount</Text>
        </View>
        {data.items.map((item, index) => (
          <View key={index} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}>
            <Text style={styles.col1}>{index + 1}</Text>
            <Text style={styles.col2}>{item.name}</Text>
            <Text style={styles.col3}>{item.quantity}</Text>
            <Text style={styles.col4}>Rs. {item.unitPrice.toFixed(2)}</Text>
            <Text style={styles.col6}>Rs. {item.total.toFixed(2)}</Text>
          </View>
        ))}
      </View>

      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal:</Text>
          <Text style={styles.summaryValue}>NPR {data.subtotal.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>VAT (13%):</Text>
          <Text style={styles.summaryValue}>NPR {data.vatAmount.toFixed(2)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Grand Total:</Text>
          <Text style={styles.totalValue}>NPR {data.total.toFixed(2)}</Text>
        </View>
        <View style={[styles.summaryRow, { marginTop: 10 }]}>
          <Text style={[styles.summaryLabel, styles.paidAmount]}>Amount Paid:</Text>
          <Text style={[styles.summaryValue, styles.paidAmount]}>NPR {data.paidAmount.toFixed(2)}</Text>
        </View>
        {data.dueAmount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, styles.dueAmount]}>Due Amount:</Text>
            <Text style={[styles.summaryValue, styles.dueAmount]}>NPR {data.dueAmount.toFixed(2)}</Text>
          </View>
        )}
      </View>

      {/* Notes */}
      {data.notes && (
        <View style={[styles.section, { marginTop: 15 }]}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={{ fontSize: 9, color: "#666" }}>{data.notes}</Text>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerThankYou}>Thank you for choosing us!</Text>
        <Text style={styles.footerText}>This is a computer-generated invoice. No signature required.</Text>
        <Text style={styles.footerText}>
          For any queries, please contact us at {data.pharmacy.phone || data.pharmacy.email || "our store"}.
        </Text>
      </View>
    </Page>
  </Document>
);

export const generateInvoicePDF = async (data: InvoiceData): Promise<Blob> => {
  const blob = await pdf(<InvoiceDocument data={data} />).toBlob();
  return blob;
};

export const downloadInvoicePDF = async (data: InvoiceData) => {
  const blob = await generateInvoicePDF(data);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Invoice-${data.invoiceNumber}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default InvoiceDocument;
