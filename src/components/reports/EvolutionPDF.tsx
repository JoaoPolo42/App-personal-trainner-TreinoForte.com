'use client';
import {
  Document, Page, Text, View, StyleSheet, PDFDownloadLink, Font
} from '@react-pdf/renderer';
import type { Client, BodyMeasurement, TrainingSession } from '@/types/database';
import { calculateAge, calculateBMI, bmiLabel, formatDate, pseLabel } from '@/lib/utils';

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, padding: 40, color: '#1a1a1a' },
  header: { backgroundColor: '#1d4ed8', color: 'white', padding: 20, marginBottom: 20, borderRadius: 6 },
  headerTitle: { fontSize: 20, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  headerSub: { fontSize: 10, opacity: 0.8 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#1d4ed8', marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#bfdbfe', paddingBottom: 4 },
  row: { flexDirection: 'row', marginBottom: 4 },
  col: { flex: 1 },
  label: { fontFamily: 'Helvetica-Bold', color: '#6b7280', marginRight: 4 },
  value: { color: '#1a1a1a' },
  table: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f3f4f6', padding: 6 },
  tableRow: { flexDirection: 'row', padding: 6, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  tableCell: { flex: 1, fontSize: 9 },
  tableCellBold: { flex: 1, fontSize: 9, fontFamily: 'Helvetica-Bold' },
  kpiGrid: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  kpiCard: { flex: 1, backgroundColor: '#eff6ff', padding: 10, borderRadius: 6, alignItems: 'center' },
  kpiValue: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#1d4ed8' },
  kpiLabel: { fontSize: 8, color: '#6b7280', marginTop: 2 },
  deltaPos: { color: '#16a34a' },
  deltaNeg: { color: '#dc2626' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: '#9ca3af', borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8 },
});

interface Props {
  client: Client;
  measurements: BodyMeasurement[];
  sessions: TrainingSession[];
  trainerName: string;
}

function EvolutionDocument({ client, measurements, sessions, trainerName }: Props) {
  const first = measurements[0];
  const last = measurements[measurements.length - 1];

  function delta(a: number | null | undefined, b: number | null | undefined) {
    if (!a || !b) return '—';
    const d = parseFloat((b - a).toFixed(1));
    return (d > 0 ? '+' : '') + d;
  }

  const totalSessions = sessions.length;
  const avgPse = sessions.filter(s => s.pse).length > 0
    ? (sessions.reduce((acc, s) => acc + (s.pse ?? 0), 0) / sessions.filter(s => s.pse).length).toFixed(1)
    : '—';
  const latestMeasure = last;
  const bmi = latestMeasure?.weight_kg && latestMeasure?.height_cm
    ? calculateBMI(latestMeasure.weight_kg, latestMeasure.height_cm) : null;

  return (
    <Document title={`Relatório de Evolução — ${client.full_name}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Relatório de Evolução</Text>
          <Text style={styles.headerSub}>{client.full_name} · Trainer: {trainerName} · {new Date().toLocaleDateString('pt-BR')}</Text>
        </View>

        {/* KPIs */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{totalSessions}</Text>
            <Text style={styles.kpiLabel}>Sessões</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{latestMeasure?.weight_kg ?? '—'}</Text>
            <Text style={styles.kpiLabel}>Peso atual (kg)</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{bmi ?? '—'}</Text>
            <Text style={styles.kpiLabel}>IMC</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{avgPse}</Text>
            <Text style={styles.kpiLabel}>PSE médio</Text>
          </View>
        </View>

        {/* Dados do Cliente */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados do Cliente</Text>
          <View style={styles.row}>
            <View style={styles.col}><Text><Text style={styles.label}>Nome:</Text> {client.full_name}</Text></View>
            <View style={styles.col}><Text><Text style={styles.label}>Idade:</Text> {client.birth_date ? calculateAge(client.birth_date) + ' anos' : '—'}</Text></View>
          </View>
          <View style={styles.row}>
            <View style={styles.col}><Text><Text style={styles.label}>Objetivo:</Text> {client.objective ?? '—'}</Text></View>
            <View style={styles.col}><Text><Text style={styles.label}>Nível:</Text> {client.fitness_level ?? '—'}</Text></View>
          </View>
        </View>

        {/* Comparativo de Medições */}
        {first && last && first.id !== last.id && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Comparativo de Medições</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableCellBold}>Indicador</Text>
                <Text style={styles.tableCellBold}>Inicial ({formatDate(first.measured_at)})</Text>
                <Text style={styles.tableCellBold}>Atual ({formatDate(last.measured_at)})</Text>
                <Text style={styles.tableCellBold}>Variação</Text>
              </View>
              {[
                { label: 'Peso (kg)', a: first.weight_kg, b: last.weight_kg },
                { label: '% Gordura', a: first.body_fat_pct, b: last.body_fat_pct },
                { label: 'Cintura (cm)', a: first.waist_cm, b: last.waist_cm },
                { label: 'Quadril (cm)', a: first.hip_cm, b: last.hip_cm },
                { label: 'Braço (cm)', a: first.arm_cm, b: last.arm_cm },
                { label: 'Coxa (cm)', a: first.thigh_cm, b: last.thigh_cm },
              ].map(({ label, a, b }) => (
                <View style={styles.tableRow} key={label}>
                  <Text style={styles.tableCellBold}>{label}</Text>
                  <Text style={styles.tableCell}>{a ?? '—'}</Text>
                  <Text style={styles.tableCell}>{b ?? '—'}</Text>
                  <Text style={styles.tableCell}>{delta(a, b)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Últimas sessões */}
        {sessions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Histórico de Sessões (últimas 10)</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableCellBold}>Data</Text>
                <Text style={styles.tableCellBold}>Duração</Text>
                <Text style={styles.tableCellBold}>FC rep.</Text>
                <Text style={styles.tableCellBold}>FC máx.</Text>
                <Text style={styles.tableCellBold}>PSE</Text>
              </View>
              {sessions.slice(-10).reverse().map((s) => (
                <View style={styles.tableRow} key={s.id}>
                  <Text style={styles.tableCell}>{formatDate(s.session_date)}</Text>
                  <Text style={styles.tableCell}>{s.duration_minutes ? `${s.duration_minutes} min` : '—'}</Text>
                  <Text style={styles.tableCell}>{s.resting_hr ?? '—'}</Text>
                  <Text style={styles.tableCell}>{s.max_hr ?? '—'}</Text>
                  <Text style={styles.tableCell}>{s.pse ? `${s.pse} (${pseLabel(s.pse)})` : '—'}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <Text style={styles.footer}>
          Relatório gerado em {new Date().toLocaleDateString('pt-BR')} · TreinoForte.com
        </Text>
      </Page>
    </Document>
  );
}

export function EvolutionPDFButton({ client, measurements, sessions, trainerName }: Props) {
  return (
    <PDFDownloadLink
      document={<EvolutionDocument client={client} measurements={measurements} sessions={sessions} trainerName={trainerName} />}
      fileName={`evolucao-${client.full_name.replace(/\s+/g, '-').toLowerCase()}.pdf`}
    >
      {({ loading }) => (
        <button
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors"
          disabled={loading}
        >
          {loading ? 'Gerando PDF...' : 'Baixar PDF de Evolução'}
        </button>
      )}
    </PDFDownloadLink>
  );
}
