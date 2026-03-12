import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
  Linking,
  Platform,
  RefreshControl,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Layout } from "@/constants/theme";
import { useIsWideWeb } from "@/components/WebSidebarLayout";
import { apiRequest, getApiUrl } from "@/lib/query-client";

type ApplicantStatus = "new" | "reviewing" | "interviewed" | "hired" | "rejected";

type ApplicantSummary = {
  id: string;
  fullName: string;
  phone: string;
  addressFull: string;
  addressCity: string | null;
  addressProvince: string | null;
  applyingFor: string;
  jobPostingSource: string;
  photoFilename: string | null;
  photoMimeType: string | null;
  resumeFilename: string | null;
  resumeMimeType: string | null;
  status: ApplicantStatus;
  submittedAt: string;
};

type ApplicantDetail = ApplicantSummary & {
  addressStreet: string | null;
  addressPostalCode: string | null;
  addressCountry: string | null;
  adminNotes: string | null;
  hasPhoto: boolean;
  hasResume: boolean;
};

const STATUS_OPTIONS: ApplicantStatus[] = ["new", "reviewing", "interviewed", "hired", "rejected"];

const STATUS_CONFIG: Record<ApplicantStatus, { label: string; color: string; bg: string }> = {
  new:        { label: "New",        color: "#3B82F6", bg: "#3B82F620" },
  reviewing:  { label: "Reviewing",  color: "#F59E0B", bg: "#F59E0B20" },
  interviewed:{ label: "Interviewed",color: "#8B5CF6", bg: "#8B5CF620" },
  hired:      { label: "Hired",      color: "#22C55E", bg: "#22C55E20" },
  rejected:   { label: "Rejected",   color: "#EF4444", bg: "#EF444420" },
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
  } catch { return iso; }
}

function formatTimeAgo(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

export default function ApplicantsAdminScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isWideWeb = useIsWideWeb();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? 67 : insets.top + Spacing.sm;

  const queryKey = ["/api/applicants", search, statusFilter];

  const { data: applicants = [], isLoading, refetch, isRefetching } = useQuery<ApplicantSummary[]>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await apiRequest("GET", `/api/applicants?${params.toString()}`);
      return res.json();
    },
    staleTime: 30000,
  });

  const { data: detail, isLoading: detailLoading } = useQuery<ApplicantDetail>({
    queryKey: [`/api/applicants/${selectedId}`],
    enabled: !!selectedId,
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes }: { id: string; status: string; adminNotes?: string }) => {
      const res = await apiRequest("PATCH", `/api/applicants/${id}/status`, { status, adminNotes });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applicants"] });
      queryClient.invalidateQueries({ queryKey: [`/api/applicants/${selectedId}`] });
    },
    onError: (err: any) => Alert.alert("Error", err?.message || "Failed to update status"),
  });

  const handleStatusChange = useCallback((id: string, currentStatus: string) => {
    const options = STATUS_OPTIONS.filter((s) => s !== currentStatus);
    Alert.alert(
      "Update Status",
      "Select new status for this applicant:",
      [
        ...options.map((s) => ({
          text: STATUS_CONFIG[s].label,
          onPress: () => statusMutation.mutate({ id, status: s }),
        })),
        { text: "Cancel", style: "cancel" },
      ]
    );
  }, [statusMutation]);

  const handleDownload = useCallback((id: string, type: "photo" | "resume", filename: string) => {
    const base = getApiUrl();
    const url = `${base}/api/applicants/${id}/download/${type}`;
    if (Platform.OS === "web") {
      window.open(url, "_blank");
    } else {
      Linking.openURL(url);
    }
  }, []);

  const wideStyle = isWideWeb ? { maxWidth: Layout.wideMaxWidth, alignSelf: "center" as const, width: "100%" as const } : undefined;

  // Detail panel
  if (selectedId) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={[styles.detailScroll, { paddingTop: topPadding, paddingBottom: insets.bottom + 40 }]}>
          <View style={[styles.detailInner, wideStyle]}>
            <Pressable onPress={() => setSelectedId(null)} style={styles.backBtn}>
              <Feather name="arrow-left" size={18} color={theme.primary} />
              <ThemedText style={[styles.backBtnText, { color: theme.primary }]}>All Applicants</ThemedText>
            </Pressable>

            {detailLoading || !detail ? (
              <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
            ) : (
              <>
                {/* Header */}
                <Card style={styles.detailHeader}>
                  <View style={styles.detailHeaderRow}>
                    <View style={[styles.avatarLarge, { backgroundColor: theme.primary + "20" }]}>
                      <ThemedText style={[styles.avatarLargeText, { color: theme.primary }]}>
                        {detail.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </ThemedText>
                    </View>
                    <View style={styles.detailHeaderInfo}>
                      <ThemedText style={styles.detailName}>{detail.fullName}</ThemedText>
                      <ThemedText style={[styles.detailPhone, { color: theme.textSecondary }]}>{detail.phone}</ThemedText>
                      <Pressable
                        onPress={() => handleStatusChange(detail.id, detail.status)}
                        style={[styles.statusChip, { backgroundColor: STATUS_CONFIG[detail.status].bg }]}
                      >
                        <ThemedText style={[styles.statusChipText, { color: STATUS_CONFIG[detail.status].color }]}>
                          {STATUS_CONFIG[detail.status].label}
                        </ThemedText>
                        <Feather name="chevron-down" size={12} color={STATUS_CONFIG[detail.status].color} />
                      </Pressable>
                    </View>
                  </View>
                </Card>

                {/* Info */}
                <Card style={styles.detailCard}>
                  <ThemedText style={styles.detailSectionTitle}>Application Details</ThemedText>
                  <DetailRow label="Applying For" value={detail.applyingFor} theme={theme} />
                  <DetailRow label="Heard About Us" value={detail.jobPostingSource} theme={theme} />
                  <DetailRow label="Submitted" value={formatDate(detail.submittedAt)} theme={theme} />
                </Card>

                <Card style={styles.detailCard}>
                  <ThemedText style={styles.detailSectionTitle}>Address</ThemedText>
                  <DetailRow label="Full Address" value={detail.addressFull} theme={theme} />
                  {detail.addressCity ? <DetailRow label="City" value={`${detail.addressCity}${detail.addressProvince ? `, ${detail.addressProvince}` : ""}`} theme={theme} /> : null}
                  {detail.addressPostalCode ? <DetailRow label="Postal Code" value={detail.addressPostalCode} theme={theme} /> : null}
                </Card>

                {/* Downloads */}
                <Card style={styles.detailCard}>
                  <ThemedText style={styles.detailSectionTitle}>Documents</ThemedText>
                  <View style={styles.docsRow}>
                    <Pressable
                      onPress={() => detail.hasPhoto && handleDownload(detail.id, "photo", detail.photoFilename || "photo")}
                      style={[styles.docBtn, { backgroundColor: detail.hasPhoto ? theme.primary + "12" : theme.backgroundSecondary, borderColor: detail.hasPhoto ? theme.primary + "30" : theme.border }]}
                      disabled={!detail.hasPhoto}
                    >
                      <Feather name="image" size={22} color={detail.hasPhoto ? theme.primary : theme.textMuted} />
                      <ThemedText style={[styles.docBtnLabel, { color: detail.hasPhoto ? theme.primary : theme.textMuted }]}>
                        Photo
                      </ThemedText>
                      {detail.hasPhoto ? (
                        <View style={styles.downloadBadge}>
                          <Feather name="download" size={11} color={theme.primary} />
                          <ThemedText style={[styles.downloadBadgeText, { color: theme.primary }]}>Download</ThemedText>
                        </View>
                      ) : (
                        <ThemedText style={[styles.noDocText, { color: theme.textMuted }]}>Not uploaded</ThemedText>
                      )}
                    </Pressable>

                    <Pressable
                      onPress={() => detail.hasResume && handleDownload(detail.id, "resume", detail.resumeFilename || "resume")}
                      style={[styles.docBtn, { backgroundColor: detail.hasResume ? "#22C55E12" : theme.backgroundSecondary, borderColor: detail.hasResume ? "#22C55E30" : theme.border }]}
                      disabled={!detail.hasResume}
                    >
                      <Feather name="file-text" size={22} color={detail.hasResume ? "#22C55E" : theme.textMuted} />
                      <ThemedText style={[styles.docBtnLabel, { color: detail.hasResume ? "#22C55E" : theme.textMuted }]}>
                        Resume
                      </ThemedText>
                      {detail.hasResume ? (
                        <View style={styles.downloadBadge}>
                          <Feather name="download" size={11} color="#22C55E" />
                          <ThemedText style={[styles.downloadBadgeText, { color: "#22C55E" }]}>Download</ThemedText>
                        </View>
                      ) : (
                        <ThemedText style={[styles.noDocText, { color: theme.textMuted }]}>Not uploaded</ThemedText>
                      )}
                    </Pressable>
                  </View>
                  {detail.photoFilename ? <ThemedText style={[styles.filenameText, { color: theme.textMuted }]}>📷 {detail.photoFilename}</ThemedText> : null}
                  {detail.resumeFilename ? <ThemedText style={[styles.filenameText, { color: theme.textMuted }]}>📄 {detail.resumeFilename}</ThemedText> : null}
                </Card>

                {/* Status actions */}
                <View style={styles.statusActions}>
                  <ThemedText style={[styles.statusActionsLabel, { color: theme.textSecondary }]}>Move to status:</ThemedText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusChipRow}>
                    {STATUS_OPTIONS.filter((s) => s !== detail.status).map((s) => (
                      <Pressable
                        key={s}
                        onPress={() => statusMutation.mutate({ id: detail.id, status: s })}
                        style={[styles.statusActionBtn, { backgroundColor: STATUS_CONFIG[s].bg, borderColor: STATUS_CONFIG[s].color + "40" }]}
                        disabled={statusMutation.isPending}
                      >
                        <ThemedText style={[styles.statusActionText, { color: STATUS_CONFIG[s].color }]}>
                          {STATUS_CONFIG[s].label}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </ThemedView>
    );
  }

  // List view
  const filterCounts: Record<string, number> = { all: applicants.length };
  applicants.forEach((a) => { filterCounts[a.status] = (filterCounts[a.status] || 0) + 1; });

  const renderItem = ({ item }: { item: ApplicantSummary }) => {
    const sc = STATUS_CONFIG[item.status];
    return (
      <Pressable onPress={() => setSelectedId(item.id)} testID={`applicant-${item.id}`}>
        <Card style={styles.applicantCard}>
          <View style={styles.cardRow}>
            <View style={[styles.avatar, { backgroundColor: theme.primary + "20" }]}>
              <ThemedText style={[styles.avatarText, { color: theme.primary }]}>
                {item.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
              </ThemedText>
            </View>
            <View style={styles.cardInfo}>
              <View style={styles.cardTitleRow}>
                <ThemedText style={styles.cardName}>{item.fullName}</ThemedText>
                <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                  <ThemedText style={[styles.statusBadgeText, { color: sc.color }]}>{sc.label}</ThemedText>
                </View>
              </View>
              <ThemedText style={[styles.cardSub, { color: theme.textSecondary }]}>{item.phone} · {item.applyingFor}</ThemedText>
              <View style={styles.cardMeta}>
                {item.addressCity ? <ThemedText style={[styles.cardMetaText, { color: theme.textMuted }]}>{item.addressCity}{item.addressProvince ? `, ${item.addressProvince}` : ""}</ThemedText> : null}
                <ThemedText style={[styles.cardMetaText, { color: theme.textMuted }]}>{formatTimeAgo(item.submittedAt)}</ThemedText>
              </View>
              <View style={styles.docIndicators}>
                <View style={[styles.docIndicator, { backgroundColor: item.photoFilename ? "#22C55E15" : theme.backgroundSecondary }]}>
                  <Feather name="image" size={11} color={item.photoFilename ? "#22C55E" : theme.textMuted} />
                  <ThemedText style={[styles.docIndicatorText, { color: item.photoFilename ? "#22C55E" : theme.textMuted }]}>Photo</ThemedText>
                </View>
                <View style={[styles.docIndicator, { backgroundColor: item.resumeFilename ? "#22C55E15" : theme.backgroundSecondary }]}>
                  <Feather name="file-text" size={11} color={item.resumeFilename ? "#22C55E" : theme.textMuted} />
                  <ThemedText style={[styles.docIndicatorText, { color: item.resumeFilename ? "#22C55E" : theme.textMuted }]}>Resume</ThemedText>
                </View>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={theme.textMuted} />
          </View>
        </Card>
      </Pressable>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* Search + Filter Bar */}
      <View style={[styles.topBar, { paddingTop: topPadding, backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={[styles.topBarInner, wideStyle]}>
          <View style={[styles.searchBox, { backgroundColor: theme.inputBackground }]}>
            <Feather name="search" size={16} color={theme.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search name or phone..."
              placeholderTextColor={theme.textMuted}
              value={search}
              onChangeText={setSearch}
              testID="applicants-search"
            />
            {search ? (
              <Pressable onPress={() => setSearch("")}>
                <Feather name="x" size={16} color={theme.textMuted} />
              </Pressable>
            ) : null}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
            {(["all", ...STATUS_OPTIONS] as string[]).map((s) => {
              const label = s === "all" ? "All" : STATUS_CONFIG[s as ApplicantStatus].label;
              const isActive = statusFilter === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => setStatusFilter(s)}
                  style={[styles.filterChip, isActive ? { backgroundColor: theme.primary } : { backgroundColor: theme.backgroundSecondary }]}
                  testID={`filter-${s}`}
                >
                  <ThemedText style={[styles.filterChipText, { color: isActive ? "#fff" : theme.textSecondary }]}>
                    {label} {filterCounts[s] ? `(${filterCounts[s]})` : ""}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <FlatList
        data={applicants}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={theme.primary} style={styles.loader} />
          ) : (
            <View style={styles.emptyState}>
              <Feather name="users" size={48} color={theme.textSecondary} />
              <ThemedText style={styles.emptyTitle}>No Applicants Yet</ThemedText>
              <ThemedText style={[styles.emptySub, { color: theme.textSecondary }]}>
                Applications submitted at apply.wfconnect.org will appear here.
              </ThemedText>
            </View>
          )
        }
        contentContainerStyle={[styles.listContent, wideStyle, { paddingBottom: insets.bottom + 20 }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />}
        testID="applicants-list"
      />
    </ThemedView>
  );
}

function DetailRow({ label, value, theme }: { label: string; value: string; theme: any }) {
  return (
    <View style={drStyles.row}>
      <ThemedText style={[drStyles.label, { color: theme.textMuted }]}>{label}</ThemedText>
      <ThemedText style={[drStyles.value, { color: theme.text }]}>{value}</ThemedText>
    </View>
  );
}

const drStyles = StyleSheet.create({
  row: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(0,0,0,0.06)" },
  label: { width: 110, fontSize: 13, flexShrink: 0 },
  value: { flex: 1, fontSize: 13 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { borderBottomWidth: 1, paddingBottom: Spacing.sm },
  topBarInner: { paddingHorizontal: Spacing.md },
  searchBox: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, paddingHorizontal: Spacing.md, height: 40, borderRadius: BorderRadius.lg, marginBottom: Spacing.sm },
  searchInput: { flex: 1, fontSize: 15 },
  filterScroll: { maxHeight: 40 },
  filterRow: { gap: Spacing.sm, paddingHorizontal: 0 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full },
  filterChipText: { fontSize: 12, fontWeight: "600" },
  listContent: { padding: Spacing.md },
  applicantCard: { padding: Spacing.md, marginBottom: Spacing.sm },
  cardRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarText: { fontSize: 15, fontWeight: "700" },
  cardInfo: { flex: 1, gap: 2 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardName: { fontSize: 15, fontWeight: "700", flex: 1 },
  cardSub: { fontSize: 13 },
  cardMeta: { flexDirection: "row", gap: 8, marginTop: 2 },
  cardMetaText: { fontSize: 11 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full },
  statusBadgeText: { fontSize: 11, fontWeight: "600" },
  docIndicators: { flexDirection: "row", gap: 6, marginTop: 4 },
  docIndicator: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: BorderRadius.full },
  docIndicatorText: { fontSize: 10, fontWeight: "600" },
  loader: { marginTop: 40 },
  emptyState: { alignItems: "center", paddingTop: 80, gap: Spacing.sm },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginTop: Spacing.sm },
  emptySub: { fontSize: 14, textAlign: "center", maxWidth: 300 },
  // Detail
  detailScroll: { paddingHorizontal: Spacing.md },
  detailInner: {},
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: Spacing.md },
  backBtnText: { fontSize: 15, fontWeight: "600" },
  detailHeader: { padding: Spacing.md, marginBottom: Spacing.sm },
  detailHeaderRow: { flexDirection: "row", gap: Spacing.md, alignItems: "flex-start" },
  avatarLarge: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  avatarLargeText: { fontSize: 22, fontWeight: "700" },
  detailHeaderInfo: { flex: 1, gap: 4 },
  detailName: { fontSize: 20, fontWeight: "700" },
  detailPhone: { fontSize: 14 },
  statusChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full, alignSelf: "flex-start" },
  statusChipText: { fontSize: 12, fontWeight: "700" },
  detailCard: { padding: Spacing.md, marginBottom: Spacing.sm },
  detailSectionTitle: { fontSize: 14, fontWeight: "700", marginBottom: Spacing.sm },
  docsRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.sm },
  docBtn: { flex: 1, alignItems: "center", padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1, gap: 4 },
  docBtnLabel: { fontSize: 14, fontWeight: "600" },
  downloadBadge: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  downloadBadgeText: { fontSize: 11, fontWeight: "600" },
  noDocText: { fontSize: 11 },
  filenameText: { fontSize: 12, marginTop: 2 },
  statusActions: { marginBottom: Spacing.lg },
  statusActionsLabel: { fontSize: 13, fontWeight: "600", marginBottom: Spacing.sm },
  statusChipRow: { gap: Spacing.sm },
  statusActionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1 },
  statusActionText: { fontSize: 13, fontWeight: "700" },
});
