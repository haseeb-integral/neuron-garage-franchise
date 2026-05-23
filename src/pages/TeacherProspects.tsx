import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { TeacherProspect } from "@/data/teacherData";
import { supabase } from "@/integrations/supabase/client";
import { FindProspectsModal } from "@/components/teacher-prospects/FindProspectsModal";
import { TeacherImportWizard } from "@/components/teacher-prospects/TeacherImportWizard";
import { MasterPoolImportWizard } from "@/components/email-outreach/MasterPoolImportWizard";
import { TeacherFilterBar } from "@/components/teacher-prospects/TeacherFilterBar";
import { TeacherTable } from "@/components/teacher-prospects/TeacherTable";
import { TeacherDetailPanel } from "@/components/teacher-prospects/TeacherDetailPanel";
import { BulkActionBar } from "@/components/teacher-prospects/BulkActionBar";
import { AddToCampaignModal } from "@/components/teacher-prospects/AddToCampaignModal";
import { MarketContextBanner } from "@/components/teacher-prospects/MarketContextBanner";
import { SavedListsMenu } from "@/components/teacher-prospects/SavedListsMenu";
import { TeacherSidebar } from "@/components/teacher-prospects/TeacherSidebar";
import { PageHeader } from "@/components/PageHeader";
import { useTeacherProspectsStore } from "@/stores/teacherProspectsStore";
import { CitySearchRail } from "@/components/teacher-prospects/CitySearchRail";
import { FunnelWidget } from "@/components/teacher-prospects/FunnelWidget";
import { NextBestActionStrip } from "@/components/teacher-prospects/NextBestActionStrip";
import { TeacherAiPanel } from "@/components/teacher-prospects/TeacherAiPanel";
import { useTeacherProspectsData, mapRow, type DbRow } from "@/hooks/useTeacherProspectsData";
import { useTeacherOutreachStatus } from "@/hooks/useTeacherOutreachStatus";
import { downloadProspectsCsv } from "@/lib/teacherProspectsCsv";

// Do NOT introduce an `emptyStats` zero-default — caught May 20, 2026.
// `stats === null` means "still loading"; cards must render a skeleton, not "0".

const useDebounced = <T,>(value: T, delay = 300) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

const TeacherProspects = () => {
  const navigate = useNavigate();
  const [findOpen, setFindOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [masterImportOpen, setMasterImportOpen] = useState(false);
  const [active, setActive] = useState<TeacherProspect | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [campaignTargets, setCampaignTargets] = useState<{ uuid: string; name: string }[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();

  const search = useTeacherProspectsStore((s) => s.search);
  const setSearch = useTeacherProspectsStore((s) => s.setSearch);
  const cityFilters = useTeacherProspectsStore((s) => s.cityFilters);
  const setCityFilters = useTeacherProspectsStore((s) => s.setCityFilters);
  const removeCityFilter = useTeacherProspectsStore((s) => s.removeCityFilter);
  const sourceFilter = useTeacherProspectsStore((s) => s.sourceFilter);
  const setSourceFilter = useTeacherProspectsStore((s) => s.setSourceFilter);
  const hideInOutreach = useTeacherProspectsStore((s) => s.hideInOutreach);
  const setHideInOutreach = useTeacherProspectsStore((s) => s.setHideInOutreach);
  const page = useTeacherProspectsStore((s) => s.page);
  const setPage = useTeacherProspectsStore((s) => s.setPage);
  const pageSize = useTeacherProspectsStore((s) => s.pageSize);
  const setPageSize = useTeacherProspectsStore((s) => s.setPageSize);

  const debouncedSearch = useDebounced(search, 350);

  // Outreach status (kept first because data fetch depends on allPromotedIds for "hide" filter)
  // Note: outreach status hook subscribes to `prospects` for its per-page lookup;
  // we read prospects from the data hook below and pass them in.
  const [prospectsForOutreach, setProspectsForOutreach] = useState<TeacherProspect[]>([]);
  const { promotedUuids, promotedInfo, allPromotedIds, campaignNames, refreshAllPromoted } =
    useTeacherOutreachStatus(prospectsForOutreach);

  const data = useTeacherProspectsData({
    page, pageSize, cityFilters, debouncedSearch, sourceFilter, hideInOutreach, allPromotedIds,
  });
  const {
    prospects, setProspects, totalCount, stats, statsError, cities,
    loadingProspects, loadedAt, loadPage, loadStats, buildFilteredQuery,
  } = data;

  // Keep outreach hook fed with current page
  useEffect(() => { setProspectsForOutreach(prospects); }, [prospects]);

  // URL ?city= (CSV, multi-city) and ?prospect= handling
  const consumedPromptRef = useRef(false);
  useEffect(() => {
    if (consumedPromptRef.current) return;
    const urlCity = searchParams.get("city");
    if (urlCity) {
      const list = urlCity.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 10);
      if (list.length) setCityFilters(list);
      consumedPromptRef.current = true;
    }
  }, [searchParams, setCityFilters]);

  useEffect(() => {
    const prospectId = searchParams.get("prospect");
    if (prospectId && prospects.length) {
      const found = prospects.find((p) => p.uuid === prospectId);
      if (found) setActive(found);
      searchParams.delete("prospect");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prospects]);

  const handleExport = async () => {
    if (selected.length > 0) return handleExportSelected();
    const expected = (stats?.total ?? 0) || totalCount;
    if (expected === 0) { toast.info("Nothing to export with the current filters."); return; }
    const t = toast.loading(`Exporting ${expected.toLocaleString()} rows…`);
    const chunkSize = 1000;
    const all: TeacherProspect[] = [];
    let from = 0;
    try {
      while (true) {
        const { data: batchData, error } = await buildFilteredQuery().range(from, from + chunkSize - 1);
        if (error) throw error;
        const batch = (batchData ?? []).map((r) => mapRow(r as unknown as DbRow));
        all.push(...batch);
        if (batch.length < chunkSize) break;
        from += chunkSize;
        if (from > 50000) break;
      }
      downloadProspectsCsv(all, "all-filtered");
      toast.success(`Exported ${all.length.toLocaleString()} rows to CSV.`, { id: t });
    } catch (e) {
      toast.error(`Export failed: ${e instanceof Error ? e.message : String(e)}`, { id: t });
    }
  };

  const handleExportSelected = async () => {
    const selectedProspects = prospects.filter((p) => selected.includes(p.uuid));
    if (selectedProspects.length === 0) return;
    downloadProspectsCsv(selectedProspects, "selected");
    toast.success(`Exported ${selectedProspects.length} selected ${selectedProspects.length === 1 ? "row" : "rows"} to CSV.`);
  };

  const handleBulkAddTag = async (tag: string) => {
    const selectedProspects = prospects.filter((p) => selected.includes(p.uuid));
    const uuids = selectedProspects.map((p) => p.uuid);
    if (uuids.length === 0) return;
    await Promise.all(selectedProspects.map(async (p) => {
      const next = Array.from(new Set([...(p.tags ?? []), tag]));
      await supabase.from("teacher_prospects").update({ tags: next }).eq("id", p.uuid);
    }));
    setProspects((prev) => prev.map((x) => uuids.includes(x.uuid) ? { ...x, tags: Array.from(new Set([...(x.tags ?? []), tag])) } : x));
    toast.success(`Tag "${tag}" applied to ${uuids.length} ${uuids.length === 1 ? "teacher" : "teachers"}.`);
  };

  const toggleSelect = (uuid: string) =>
    setSelected((prev) => prev.includes(uuid) ? prev.filter((x) => x !== uuid) : [...prev, uuid]);
  const toggleAll = () => {
    const visibleIds = prospects.map((p) => p.uuid);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));
    setSelected(allSelected ? selected.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...selected, ...visibleIds])));
  };

  const handlePromote = (p: TeacherProspect) => {
    setCampaignTargets([{ uuid: p.uuid, name: p.name }]);
    setCampaignModalOpen(true);
  };
  const handlePromoteBulk = () => {
    const selectedProspects = prospects.filter((p) => selected.includes(p.uuid));
    if (selectedProspects.length === 0) return;
    setCampaignTargets(selectedProspects.map((p) => ({ uuid: p.uuid, name: p.name })));
    setCampaignModalOpen(true);
  };
  const handleShortlist = async (p: TeacherProspect) => {
    const nextStatus = p.status === "shortlisted" ? "new" : "shortlisted";
    setProspects((prev) => prev.map((x) => (x.uuid === p.uuid ? { ...x, status: nextStatus } : x)));
    const { error } = await supabase.from("teacher_prospects").update({ status: nextStatus }).eq("id", p.uuid);
    if (error) { toast.error(`Couldn't update: ${error.message}`); loadPage(); }
    else toast.success(nextStatus === "shortlisted" ? `${p.name} added to shortlist` : `${p.name} removed from shortlist`);
  };
  const handleMarkNotFit = async (p: TeacherProspect) => {
    setActive(null);
    setProspects((prev) => prev.map((x) => (x.uuid === p.uuid ? { ...x, status: "not_fit" } : x)));
    const { error } = await supabase.from("teacher_prospects").update({ status: "not_fit" }).eq("id", p.uuid);
    if (error) { toast.error(`Couldn't update: ${error.message}`); loadPage(); return; }
    toast.success(`${p.name} marked Not a Fit`, {
      action: { label: "Undo", onClick: async () => {
        await supabase.from("teacher_prospects").update({ status: "new" }).eq("id", p.uuid);
        loadPage();
      }},
    });
  };
  const handleEnrich = async (p: TeacherProspect) => {
    if (!p.schoolNcesId) { toast.info("School isn't linked to NCES yet — can't enrich automatically."); return; }
    toast.info(`Enrichment queued for ${p.school}…`);
    const { error } = await supabase.functions.invoke("enrich-school-staff", { body: { nces_id: p.schoolNcesId } });
    if (error) toast.error(`Enrichment failed: ${error.message}`);
    else toast.success("Enrichment complete. Reloading…", { action: { label: "Reload", onClick: () => loadPage() } });
  };
  const handleAfterAddedToCampaign = (addedUuids: string[]) => {
    setSelected([]);
    refreshAllPromoted();
    loadPage();
  };

  const handleUpdate = (p: TeacherProspect) => setProspects((prev) => prev.map((x) => (x.uuid === p.uuid ? p : x)));
  const handleFindResults = async () => { await loadPage(); await loadStats(); };

  // --- Bulk dock handlers ---
  const selectedProspects = useMemo(
    () => prospects.filter((p) => selected.includes(p.uuid)),
    [prospects, selected],
  );
  const enrichableSelectedCount = useMemo(
    () => selectedProspects.filter((p) => p.needsEmailEnrichment && p.schoolNcesId).length,
    [selectedProspects],
  );

  const handleEnrichSelected = async () => {
    const targets = selectedProspects.filter((p) => p.needsEmailEnrichment && p.schoolNcesId);
    if (targets.length === 0) { toast.info("No selected rows are enrichable (need NCES school id)."); return; }
    const uniqueNces = Array.from(new Set(targets.map((p) => p.schoolNcesId!)));
    const t = toast.loading(`Enriching ${uniqueNces.length} ${uniqueNces.length === 1 ? "school" : "schools"}…`);
    let ok = 0, fail = 0;
    for (let i = 0; i < uniqueNces.length; i += 5) {
      const chunk = uniqueNces.slice(i, i + 5);
      const results = await Promise.allSettled(chunk.map((nces_id) =>
        supabase.functions.invoke("enrich-school-staff", { body: { nces_id } })
      ));
      for (const r of results) {
        if (r.status === "fulfilled" && !r.value.error) ok++; else fail++;
      }
    }
    toast.success(`Enrichment done — ${ok} ok, ${fail} failed.`, { id: t, action: { label: "Reload", onClick: loadPage } });
  };

  const handlePromoteToCandidate = async () => {
    if (selectedProspects.length === 0) return;
    const rows = selectedProspects.map((p) => {
      const [first, ...rest] = (p.name || "").split(" ");
      return {
        prospect_id: p.uuid,
        first_name: first || "(Unknown)",
        last_name: rest.join(" ") || "—",
        email: p.email || `noemail+${p.uuid.slice(0, 8)}@placeholder.local`,
        city: p.city,
        state: p.state,
        fit_score: p.fitScore ?? 0,
        current_stage: "new_lead" as const,
      };
    });
    const { error } = await supabase.from("candidates").insert(rows);
    if (error) { toast.error(`Couldn't promote: ${error.message}`); return; }
    toast.success(`Promoted ${rows.length} ${rows.length === 1 ? "teacher" : "teachers"} to Candidate Pipeline.`);
    setSelected([]);
  };

  const handleBulkStatus = async (status: "shortlisted" | "in_outreach" | "not_fit" | "new") => {
    const uuids = selectedProspects.map((p) => p.uuid);
    if (uuids.length === 0) return;
    const { error } = await supabase.from("teacher_prospects").update({ status }).in("id", uuids);
    if (error) { toast.error(`Status update failed: ${error.message}`); return; }
    setProspects((prev) => prev.map((x) => uuids.includes(x.uuid) ? { ...x, status: status as TeacherProspect["status"] } : x));
    toast.success(`Set ${uuids.length} ${uuids.length === 1 ? "row" : "rows"} → ${status.replace("_", " ")}.`);
  };

  const handlePromoteHighFit = () => {
    const uuids = prospects.filter((p) => p.fitScore >= 70 && !promotedUuids.has(p.uuid)).map((p) => p.uuid);
    if (uuids.length === 0) return;
    setSelected(uuids);
    const targets = prospects.filter((p) => uuids.includes(p.uuid));
    setCampaignTargets(targets.map((p) => ({ uuid: p.uuid, name: p.name })));
    setCampaignModalOpen(true);
  };
  const handleFocusSchool = (school: string) => {
    setSearch(school);
    toast.info(`Filtered to "${school}"`);
  };

  // --- City rail handler ---
  const handleRailPick = (city: string, _state: string | null) => {
    const next = cityFilters.includes(city) ? cityFilters.filter((c) => c !== city) : [city];
    setCityFilters(next);
    writeCitiesToUrl(next);
  };

  // --- AI panel context ---
  const inOutreachInFilter = useMemo(() => {
    const ids = new Set(allPromotedIds);
    return prospects.reduce((n, p) => n + (ids.has(p.uuid) ? 1 : 0), 0);
  }, [prospects, allPromotedIds]);

  const aiContext = useMemo(() => ({
    cityFilters,
    search,
    funnel: stats ? {
      found: stats.total,
      enriched: Math.max(0, stats.total - stats.needsEnrichment),
      emailReady: stats.withEmail,
      inOutreach: inOutreachInFilter,
    } : null,
    topTeachers: prospects.slice(0, 50).map((p) => ({
      name: p.name, school: p.school, city: p.city, state: p.state,
      fitScore: p.fitScore ?? 0, status: p.status, hasEmail: !!p.email,
    })),
  }), [cityFilters, search, stats, inOutreachInFilter, prospects]);

  const inMarket = cityFilters.length > 0;
  const isSingleMarket = cityFilters.length === 1;
  const urlStateRaw = searchParams.get("state");
  const urlStates = urlStateRaw ? urlStateRaw.split(",").map((s) => s.trim()) : [];

  const bannerCities = useMemo(
    () => cityFilters.map((c, i) => ({ city: c, state: urlStates[i] ?? null })),
    [cityFilters, urlStateRaw], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const headingTitle = useMemo(() => {
    if (!inMarket) return "Teacher Search";
    if (isSingleMarket) {
      const s = urlStates[0];
      return `Teachers in ${cityFilters[0]}${s ? `, ${s}` : ""}`;
    }
    return `Teachers in ${cityFilters[0]} +${cityFilters.length - 1} more`;
  }, [inMarket, isSingleMarket, cityFilters, urlStateRaw]); // eslint-disable-line react-hooks/exhaustive-deps

  const subtitleText = useMemo(() => {
    if (stats === null) return "Loading teachers…";
    if (stats.total > 0) {
      const when = loadedAt ? loadedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
      if (inMarket) {
        const scope = isSingleMarket ? "this market" : `${cityFilters.length} markets`;
        return `${stats.total.toLocaleString()} teachers in ${scope}${when ? ` · live as of ${when}` : ""}`;
      }
      return `${stats.total.toLocaleString()} teachers across ${stats.cities.toLocaleString()} cities${when ? ` · live as of ${when}` : ""}`;
    }
    return "Discover and evaluate potential franchisee candidates from the teaching community.";
  }, [stats, loadedAt, inMarket, isSingleMarket, cityFilters.length]);

  const writeCitiesToUrl = (next: string[]) => {
    if (next.length === 0) {
      searchParams.delete("city");
      searchParams.delete("state");
    } else {
      searchParams.set("city", next.join(","));
      searchParams.delete("state");
    }
    setSearchParams(searchParams, { replace: true });
  };

  const handleClearMarket = () => {
    setCityFilters([]);
    searchParams.delete("city");
    searchParams.delete("state");
    setSearchParams(searchParams, { replace: true });
  };

  const handleRemoveCity = (city: string) => {
    const next = cityFilters.filter((c) => c !== city);
    removeCityFilter(city);
    writeCitiesToUrl(next);
  };

  return (
    <div className="-mx-3 -my-3 min-h-screen bg-white px-3 py-3 md:-mx-5 md:px-5 lg:-mx-6 lg:px-6">
      <div className="mx-auto w-full max-w-[1360px]">
        <PageHeader
          title={headingTitle}
          subtitle={subtitleText}
          hideJourneyBar
          searchPlaceholder="Search teacher prospects, schools, cities, or specialization..."
          action={
            <div className="flex flex-wrap items-center gap-2">
              <SavedListsMenu
                current={{ cityFilters, sourceFilter, search, hideInOutreach }}
                onApply={(f) => {
                  setCityFilters(f.cityFilters);
                  setSourceFilter(f.sourceFilter);
                  setSearch(f.search);
                  setHideInOutreach(f.hideInOutreach);
                  writeCitiesToUrl(f.cityFilters);
                }}
              />
              <Button size="sm" variant="outline" onClick={handleExport} className="h-9 rounded-lg border-[#dbe4f2] bg-white px-4 text-[#174be8] shadow-none hover:bg-[#f4f7ff]">
                <Download size={14} /> {selected.length > 0 ? `Export ${selected.length} Selected` : "Export CSV"}
              </Button>
              <button onClick={() => setMasterImportOpen(true)} title="Smart CSV import to Master Teacher Pool (AI-mapped). Recommended during warm-up." className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#dbe4f2] bg-white px-3 text-xs font-bold text-[#174be8] hover:bg-[#f4f7ff]">
                <Upload size={14} /> Import to Master Pool
              </button>
              <button onClick={() => setImportOpen(true)} title="Legacy: import straight into SmartLead (skips Master Pool)" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#dbe4f2] bg-white px-3 text-xs font-bold text-[#526078] hover:bg-[#f4f7ff]">
                <Upload size={14} /> Import to SmartLead
              </button>
            </div>
          }
        />

        {inMarket && (
          <MarketContextBanner
            cities={bannerCities}
            totalInMarket={stats?.total ?? null}
            emailReadyInMarket={stats?.withEmail ?? null}
            inOutreachInMarket={null}
            onRemoveCity={handleRemoveCity}
            onClearAll={handleClearMarket}
          />
        )}

        <CitySearchRail
          cityFilters={cityFilters}
          onPick={handleRailPick}
          onAddMore={() => {
            const el = document.querySelector<HTMLElement>("[data-teacher-filter-bar]");
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
        />

        <div className="mb-3 grid gap-3 md:grid-cols-2">
          <FunnelWidget
            total={stats?.total ?? null}
            emailReady={stats?.withEmail ?? null}
            needsEnrichment={stats?.needsEnrichment ?? null}
            inOutreach={inOutreachInFilter}
            loading={stats === null && !statsError}
          />
          <NextBestActionStrip
            stats={stats}
            visibleProspects={prospects.map((p) => ({ uuid: p.uuid, school: p.school, fitScore: p.fitScore ?? 0, needsEmailEnrichment: !!p.needsEmailEnrichment }))}
            promotedUuids={promotedUuids}
            onPromoteHighFit={handlePromoteHighFit}
            onFocusSchool={handleFocusSchool}
            onExportCsv={handleExport}
            onOpenImport={() => setMasterImportOpen(true)}
          />
        </div>

        <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-3" data-teacher-filter-bar>
            <TeacherFilterBar
              cities={cities}
              cityFilters={cityFilters}
              setCityFilters={(v) => { setCityFilters(v); writeCitiesToUrl(v); }}
              sourceFilter={sourceFilter}
              setSourceFilter={setSourceFilter}
              search={search}
              setSearch={setSearch}
              hideInOutreach={hideInOutreach}
              setHideInOutreach={setHideInOutreach}
              inOutreachCount={allPromotedIds.length}
            />
            <BulkActionBar
              count={selected.length}
              enrichableCount={enrichableSelectedCount}
              onExport={handleExportSelected}
              onAddTag={handleBulkAddTag}
              onPromote={handlePromoteBulk}
              onClear={() => setSelected([])}
              onPromoteToCandidate={handlePromoteToCandidate}
              onEnrichSelected={handleEnrichSelected}
              onSetStatus={handleBulkStatus}
            />
            <TeacherTable
              prospects={prospects}
              selected={selected}
              onToggleSelect={toggleSelect}
              onToggleAll={toggleAll}
              onRowClick={(p) => { setActive(p); setSelected([]); }}
              onPromote={handlePromote}
              onShortlist={handleShortlist}
              onEnrich={handleEnrich}
              onMarkNotFit={handleMarkNotFit}
              promotedUuids={promotedUuids}
              promotedInfo={promotedInfo}
              campaignNames={campaignNames}
              page={page}
              pageSize={pageSize}
              totalCount={totalCount}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              loading={loadingProspects}
              hideCityColumn={isSingleMarket}
            />
          </div>

          <TeacherSidebar
            stats={stats}
            statsError={statsError}
            onRefresh={() => { loadPage(); loadStats(); }}
            onRetryStats={loadStats}
          />
        </div>

        <FindProspectsModal open={findOpen} onOpenChange={setFindOpen} onResults={handleFindResults} />
        <TeacherImportWizard open={importOpen} onClose={() => setImportOpen(false)} onComplete={() => { loadPage(); loadStats(); }} />
        <MasterPoolImportWizard open={masterImportOpen} onClose={() => setMasterImportOpen(false)} onComplete={() => { loadPage(); loadStats(); }} />
        <TeacherDetailPanel
          prospect={active}
          onClose={() => setActive(null)}
          onUpdate={handleUpdate}
          onPromote={handlePromote}
          onMarkNotFit={handleMarkNotFit}
          isPromoted={active ? promotedUuids.has(active.uuid) || active.status === "in_outreach" : false}
          isPromoting={false}
        />
        <AddToCampaignModal
          open={campaignModalOpen}
          onOpenChange={setCampaignModalOpen}
          prospectUuids={campaignTargets.map((t) => t.uuid)}
          prospectNames={campaignTargets.map((t) => t.name)}
          onAdded={handleAfterAddedToCampaign}
        />
        <TeacherAiPanel context={aiContext} />
      </div>
    </div>
  );
};

export default TeacherProspects;
