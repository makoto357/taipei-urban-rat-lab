import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { addDoc, collection, serverTimestamp, Timestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import type {
  BaitActionType,
  ObservationType,
  PlaceType,
  SpeciesConfidence,
  SurveyMethod,
  SurveyResult,
  SuspectedSpecies,
} from "@taipei-rat-lab/contracts";
import { StaffHeader, StaffSidebar } from "../../components/StaffHeader";
import { SiteFooter } from "../../components/SiteFooter";
import { useAuth } from "../../features/auth/AuthProvider";
import { useRequireOfficial } from "../../features/official/useRequireOfficial";
import {
  BAIT_ACTIONS,
  ENVIRONMENT_OBSERVATION_TYPES,
  PLACE_TYPES,
  SPECIES_CONFIDENCE,
  SURVEY_METHODS,
  SURVEY_RESULTS,
  SUSPECTED_SPECIES,
  TRACE_OBSERVATION_TYPES,
} from "../../features/official/recordOptions";
import { usePhotoUploads } from "../../features/report/usePhotoUploads";
import { photoFileError, isObservedAtReasonable } from "../../features/report/validation";
import { DISTRICTS } from "../../features/report/steps";
import { db, functions } from "../../lib/firebase";
import { LocationPicker } from "../../features/map/LocationPicker";
import { useGeocoder } from "../../features/map/useGeocoder";

type RecordTab = "survey" | "bait";

/**
 * 對應 Claude Artifact StaffRecord.dc.html 的「新增紀錄」。「採樣紀錄」分頁
 * 在設計稿上就標示為研究治理核准前的設計草稿，這裡維持同樣定位：顯示但
 * 不可送出，plan.md Phase 5 明訂 sampleRecords 要等 Phase 0 研究治理 gate
 * 通過才能實作。
 */
export function OfficialRecordPage() {
  const gate = useRequireOfficial();
  const [tab, setTab] = useState<RecordTab>("survey");

  if (gate.status === "loading") return null;
  if (gate.status === "signed-out") return <Navigate to="/login" replace />;
  if (gate.status === "no-access") return <Navigate to="/account-status" replace />;

  return (
    <>
      <StaffHeader />
      <main className="mx-auto flex w-full max-w-container flex-wrap items-start gap-x-12 gap-y-8 px-10 pb-16 pt-8">
        <StaffSidebar />
        <div className="min-w-0 max-w-[820px] flex-[999_1_560px] flex flex-col gap-5">
          <h1 className="m-0 text-[30px] font-black">新增紀錄</h1>

          <div role="tablist" aria-label="紀錄類型" className="grid grid-cols-3 gap-0.5 border-2 border-ink bg-ink">
            <TabButton active={tab === "survey"} onClick={() => setTab("survey")} label="鼠跡調查" />
            <TabButton active={tab === "bait"} onClick={() => setTab("bait")} label="投藥紀錄" />
            <TabButton active={false} onClick={() => {}} label="採樣紀錄" disabled note="研究治理核准前不啟用" />
          </div>

          {tab === "survey" && <SurveyForm organizationId={gate.organizationId} />}
          {tab === "bait" && <BaitForm organizationId={gate.organizationId} />}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function TabButton({
  active,
  onClick,
  label,
  disabled,
  note,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
  note?: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      disabled={disabled}
      title={note}
      className={`flex min-h-14 flex-col items-center justify-center gap-0.5 border-0 font-heading text-lg font-black ${
        disabled ? "cursor-not-allowed bg-unknown text-muted" : active ? "bg-accent" : "bg-paper"
      }`}
    >
      {label}
      {note && <span className="font-body text-[11px] font-normal">{note}</span>}
    </button>
  );
}

function LocationFields({
  addressText,
  setAddressText,
  district,
  setDistrict,
  location,
  locating,
  locationError,
  onUseCurrentLocation,
  onPick,
}: {
  addressText: string;
  setAddressText: (v: string) => void;
  district: string;
  setDistrict: (v: string) => void;
  location: { latitude: number; longitude: number } | null;
  locating: boolean;
  locationError: string | null;
  onUseCurrentLocation: () => void;
  onPick: (l: { latitude: number; longitude: number }) => void;
}) {
  const geocoder = useGeocoder({
    onAddress: ({ addressText: text, district: found }) => {
      setAddressText(text);
      if (found) setDistrict(found);
    },
    onLocated: onPick,
  });
  return (
    <section className="flex flex-col gap-3">
      <h2 className="m-0 font-heading text-xl font-black">地點與時間</h2>
      <div className="flex flex-wrap gap-2.5">
        <label className="flex min-h-11 flex-[1_1_240px] items-center gap-2.5 border-[1.5px] border-ink bg-paper px-3 font-body">
          <span className="sr-only">輸入地址或地標</span>
          <input
            type="text"
            value={addressText}
            onChange={(e) => setAddressText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void geocoder.locateAddress(addressText);
              }
            }}
            placeholder="輸入地址或地標"
            className="min-w-0 flex-1 border-0 bg-transparent text-[15px] outline-none"
          />
          <button
            type="button"
            onClick={() => void geocoder.locateAddress(addressText)}
            disabled={geocoder.busy || addressText.trim() === ""}
            className="min-h-9 border-[1.5px] border-ink bg-card px-3 font-heading text-[13px] font-bold disabled:opacity-50"
          >
            在地圖上定位
          </button>
        </label>
        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          className="min-h-11 border-[1.5px] border-ink bg-paper px-2.5 font-body text-[15px]"
        >
          <option value="">選擇行政區</option>
          {DISTRICTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onUseCurrentLocation}
          disabled={locating}
          className="inline-flex min-h-11 items-center gap-2 border-[1.5px] border-ink bg-card px-4 font-heading text-[15px] font-bold disabled:opacity-60"
        >
          {locating ? "定位中…" : "使用目前位置"}
        </button>
      </div>
      <LocationPicker
        value={location}
        onChange={(picked) => {
          onPick(picked);
          void geocoder.lookupAddress(picked.latitude, picked.longitude);
        }}
        className="relative h-[240px] border-[1.5px] border-ink"
      />
      {geocoder.busy && <p role="status" className="m-0 font-body text-xs">查詢地址中…</p>}
      {geocoder.error && <p role="alert" className="m-0 font-body text-xs text-accent-text">{geocoder.error}</p>}
      {locationError && <p className="m-0 font-body text-xs text-accent-text">{locationError}</p>}
      {location && (
        <p className="m-0 font-body text-xs text-[#4A463C]">
          座標：{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
        </p>
      )}
    </section>
  );
}

function useLocationCapture() {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  function useCurrentLocation() {
    setLocationError(null);
    if (!("geolocation" in navigator)) {
      setLocationError("這個瀏覽器不支援定位，請手動輸入地址。");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocationError("無法取得目前位置，請手動輸入地址。");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return { location, setLocation, locating, locationError, useCurrentLocation };
}

function PhotoPicker({ photos, onSelect, onRemove }: {
  photos: ReturnType<typeof usePhotoUploads>["photos"];
  onSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (mediaId: string) => void;
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="m-0 font-heading text-xl font-black">
        事件照片 <span className="font-body text-[13px] font-normal text-[#4A463C]">（選填，最多 3 張）</span>
      </h2>
      {photos.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0 font-body text-[13px]">
          {photos.map((p) => (
            <li key={p.mediaId} className="flex items-center justify-between gap-3 border-[1.5px] border-ink bg-paper px-3 py-1.5">
              <img src={p.previewUrl} alt={`已選擇的照片：${p.fileName}`} className="h-14 w-14 shrink-0 border border-ink object-cover" />
              <span className="min-w-0 flex-1 break-words">
                {p.fileName} —{" "}
                {p.status === "uploading" ? `上傳中 ${p.progress}%` : p.status === "processing" ? "處理中" : p.status === "clean" ? "完成" : "失敗"}
              </span>
              <button type="button" onClick={() => onRemove(p.mediaId)} className="border-0 bg-transparent font-bold text-accent-text">
                移除
              </button>
            </li>
          ))}
        </ul>
      )}
      {photos.length < 3 && (
        <label className="relative flex min-h-[88px] cursor-pointer items-center justify-center gap-2.5 border-2 border-dashed border-ink bg-paper font-body text-[15px] font-medium">
          拍照或選擇照片
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onSelect} className="absolute h-px w-px opacity-0" />
        </label>
      )}
    </section>
  );
}

function SurveyForm({ organizationId }: { organizationId: string | undefined }) {
  const navigate = useNavigate();
  const loc = useLocationCapture();
  const [addressText, setAddressText] = useState("");
  const [district, setDistrict] = useState("");
  const [observedDate, setObservedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [observedTime, setObservedTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [surveyMethod, setSurveyMethod] = useState<SurveyMethod>("visual_inspection");
  const [surveyResult, setSurveyResult] = useState<SurveyResult>("evidence_found");
  const [observationTypes, setObservationTypes] = useState<Set<ObservationType>>(new Set());
  const [suspectedSpecies, setSuspectedSpecies] = useState<SuspectedSpecies>("unknown");
  const [speciesConfidence, setSpeciesConfidence] = useState<SpeciesConfidence | null>(null);
  const [linkedCitizenReportId, setLinkedCitizenReportId] = useState("");
  const [description, setDescription] = useState("");
  const [recommendedActions, setRecommendedActions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();
  const photoUploads = usePhotoUploads(user?.uid ?? null);

  function toggleObservationType(type: ObservationType) {
    setObservationTypes((current) => {
      const next = new Set(current);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function handlePhotoSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const err = photoFileError(file);
    if (err) {
      setError(err);
      return;
    }
    void photoUploads.addPhoto(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !organizationId || submitting) return;
    if (!addressText.trim() || !district || !loc.location) {
      setError("請完成地點（地址、行政區、座標）。");
      return;
    }
    if (!photoUploads.allSettled) {
      setError("照片還在處理中，請稍候再送出。");
      return;
    }
    const observedAt = new Date(`${observedDate}T${observedTime}:00`);
    if (Number.isNaN(observedAt.getTime()) || !isObservedAtReasonable(observedAt)) {
      setError("觀察日期／時間不正確，或是未來的時間。");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await addDoc(collection(db, "officialObservations"), {
        reporterId: user.uid,
        organizationId,
        observedAt: Timestamp.fromDate(observedAt),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        location: { latitude: loc.location.latitude, longitude: loc.location.longitude },
        addressText: addressText.trim(),
        district,
        surveyMethod,
        surveyResult,
        observationTypes: Array.from(observationTypes),
        ...(suspectedSpecies !== "unknown" ? { suspectedSpecies } : {}),
        ...(speciesConfidence ? { speciesConfidence } : {}),
        ...(linkedCitizenReportId.trim() ? { linkedCitizenReportId: linkedCitizenReportId.trim() } : {}),
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(recommendedActions.trim() ? { recommendedActions: recommendedActions.trim() } : {}),
        photoPaths: photoUploads.cleanStoragePaths,
        schemaVersion: 1,
      });
      navigate("/official");
    } catch {
      setError("送出失敗，請確認網路連線後再試一次。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-7 border-2 border-ink bg-card px-8 py-7 font-body">
      <LocationFields
        addressText={addressText}
        setAddressText={setAddressText}
        district={district}
        setDistrict={setDistrict}
        location={loc.location}
        locating={loc.locating}
        locationError={loc.locationError}
        onUseCurrentLocation={loc.useCurrentLocation}
        onPick={loc.setLocation}
      />
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-[1_1_160px] flex-col gap-1.5 text-[13px]">
          調查日期
          <input type="date" value={observedDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setObservedDate(e.target.value)} className="min-h-11 border-[1.5px] border-ink bg-paper px-2.5 text-[15px]" />
        </label>
        <label className="flex flex-[1_1_140px] flex-col gap-1.5 text-[13px]">
          時間
          <input type="time" value={observedTime} onChange={(e) => setObservedTime(e.target.value)} className="min-h-11 border-[1.5px] border-ink bg-paper px-2.5 text-[15px]" />
        </label>
      </div>

      <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
        <legend className="mb-1 p-0 font-heading text-xl font-black">調查方式</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-[15px]">
          {SURVEY_METHODS.map((m) => (
            <label key={m.value} className="flex min-h-11 cursor-pointer items-center gap-2">
              <input type="radio" name="surveyMethod" checked={surveyMethod === m.value} onChange={() => setSurveyMethod(m.value)} className="m-0 h-[18px] w-[18px] accent-ink" />
              {m.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
        <legend className="mb-1 p-0 font-heading text-xl font-black">調查結果</legend>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2.5">
          {SURVEY_RESULTS.map((r) => {
            const active = surveyResult === r.value;
            return (
              <button
                key={r.value}
                type="button"
                aria-pressed={active}
                onClick={() => setSurveyResult(r.value)}
                className={`min-h-12 border-[1.5px] border-ink font-heading text-base font-bold ${active ? "bg-accent" : "bg-card"}`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
        {surveyResult === "no_evidence_found" && (
          <p className="m-0 border-[1.5px] border-ink bg-activity-l1 px-3 py-2.5 text-[13px]">
            「未發現鼠跡」只代表本次調查沒有發現，不代表這裡沒有鼠患。
          </p>
        )}
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
        <legend className="mb-1 p-0 font-heading text-xl font-black">
          觀察類型 <span className="font-body text-[13px] font-normal text-[#4A463C]">（可複選）</span>
        </legend>
        <p className="m-0 text-[13px] font-medium text-accent-text">鼠跡</p>
        <ChipGroup options={TRACE_OBSERVATION_TYPES} selected={observationTypes} onToggle={toggleObservationType} />
        <p className="m-0 mt-1.5 text-[13px] font-medium text-accent-text">環境條件</p>
        <ChipGroup options={ENVIRONMENT_OBSERVATION_TYPES} selected={observationTypes} onToggle={toggleObservationType} />
      </fieldset>

      <div className="flex flex-wrap gap-4">
        <label className="flex flex-[1_1_220px] flex-col gap-1.5 font-heading text-base font-black">
          疑似鼠種
          <select value={suspectedSpecies} onChange={(e) => setSuspectedSpecies(e.target.value as SuspectedSpecies)} className="min-h-11 border-[1.5px] border-ink bg-paper px-2.5 font-body text-[15px] font-normal">
            {SUSPECTED_SPECIES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="m-0 flex flex-[1_1_220px] flex-col gap-1.5 border-0 p-0 font-heading text-base font-black">
          <legend className="mb-0.5 p-0">鼠種判斷信心</legend>
          <div className="grid grid-cols-3 border-[1.5px] border-ink">
            {SPECIES_CONFIDENCE.map((c) => {
              const active = speciesConfidence === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSpeciesConfidence(active ? null : c.value)}
                  className={`min-h-11 border-0 font-body text-[15px] font-normal ${active ? "bg-ink text-card" : "bg-card text-ink"}`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      <label className="flex flex-col gap-1.5 font-heading text-base font-black">
        連結市民通報 <span className="font-body text-[13px] font-normal text-[#4A463C]">（選填）</span>
        <input type="text" value={linkedCitizenReportId} onChange={(e) => setLinkedCitizenReportId(e.target.value)} placeholder="通報文件 ID" className="min-h-11 border-[1.5px] border-ink bg-paper px-3 font-label text-base tracking-[0.06em]" />
      </label>
      <label className="flex flex-col gap-1.5 font-heading text-base font-black">
        現場描述 <span className="font-body text-[13px] font-normal text-[#4A463C]">（選填）</span>
        <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="border-[1.5px] border-ink bg-paper px-3 py-2.5 font-body text-[15px] font-normal" />
      </label>
      <label className="flex flex-col gap-1.5 font-heading text-base font-black">
        建議行動 <span className="font-body text-[13px] font-normal text-[#4A463C]">（選填）</span>
        <textarea rows={2} value={recommendedActions} onChange={(e) => setRecommendedActions(e.target.value)} placeholder="例如：建議兩週內設置餌站並複查" className="border-[1.5px] border-ink bg-paper px-3 py-2.5 font-body text-[15px] font-normal" />
      </label>

      <PhotoPicker photos={photoUploads.photos} onSelect={handlePhotoSelect} onRemove={photoUploads.removePhoto} />

      {error && <p className="m-0 border-[1.5px] border-ink bg-activity-l1 px-3.5 py-3 text-[13px]">{error}</p>}

      <div className="flex justify-end gap-3 border-t-2 border-ink pt-4">
        <button type="submit" disabled={submitting} className="min-h-[52px] border-2 border-ink bg-ink px-10 font-heading text-base font-bold text-card disabled:opacity-60">
          {submitting ? "儲存中…" : "儲存調查紀錄"}
        </button>
      </div>
    </form>
  );
}

function BaitForm({ organizationId }: { organizationId: string | undefined }) {
  const navigate = useNavigate();
  const loc = useLocationCapture();
  const { user } = useAuth();
  const [addressText, setAddressText] = useState("");
  const [district, setDistrict] = useState("");
  const [observedDate, setObservedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [observedTime, setObservedTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [placeType, setPlaceType] = useState<PlaceType>("public_space");
  const [actions, setActions] = useState<Set<BaitActionType>>(new Set(["checked"]));
  const [productName, setProductName] = useState("");
  const [productType, setProductType] = useState<"rodenticide" | "contraceptive" | "other" | "">("");
  const [activeIngredient, setActiveIngredient] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [linkedOfficialObservationId, setLinkedOfficialObservationId] = useState("");
  const [linkedCitizenReportId, setLinkedCitizenReportId] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const photoUploads = usePhotoUploads(user?.uid ?? null);
  const needsProduct = actions.has("bait_placed");

  function toggleAction(action: BaitActionType) {
    setActions((current) => {
      const next = new Set(current);
      if (next.has(action)) next.delete(action);
      else next.add(action);
      return next;
    });
  }

  function handlePhotoSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const err = photoFileError(file);
    if (err) {
      setError(err);
      return;
    }
    void photoUploads.addPhoto(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !organizationId || submitting) return;
    if (!addressText.trim() || !district || !loc.location) {
      setError("請完成地點（地址、行政區、座標）。");
      return;
    }
    if (actions.size === 0) {
      setError("請至少選擇一項本次行動。");
      return;
    }
    if (needsProduct && (!productName.trim() || !productType)) {
      setError("投放餌劑時，產品名稱與藥劑種類為必填。");
      return;
    }
    if (!photoUploads.allSettled) {
      setError("照片還在處理中，請稍候再送出。");
      return;
    }
    const eventTime = new Date(`${observedDate}T${observedTime}:00`);
    if (Number.isNaN(eventTime.getTime())) {
      setError("日期或時間格式不正確。");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const recordRef = await addDoc(collection(db, "baitRecords"), {
        reporterId: user.uid,
        organizationId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        location: { latitude: loc.location.latitude, longitude: loc.location.longitude },
        addressText: addressText.trim(),
        district,
        placeType,
        ...(linkedOfficialObservationId.trim() ? { linkedOfficialObservationId: linkedOfficialObservationId.trim() } : {}),
        ...(linkedCitizenReportId.trim() ? { linkedCitizenReportId: linkedCitizenReportId.trim() } : {}),
        events: [],
        schemaVersion: 1,
      });

      const appendBaitEvent = httpsCallable(functions, "appendBaitEvent");
      await appendBaitEvent({
        recordId: recordRef.id,
        actions: Array.from(actions),
        photoPaths: photoUploads.cleanStoragePaths,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        ...(needsProduct
          ? {
              product: {
                productName: productName.trim(),
                productType,
                ...(activeIngredient.trim() ? { activeIngredient: activeIngredient.trim() } : {}),
                ...(registrationNumber.trim() ? { registrationNumber: registrationNumber.trim() } : {}),
              },
            }
          : {}),
      });

      navigate("/official");
    } catch {
      setError("送出失敗，請確認網路連線後再試一次。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-7 border-2 border-ink bg-card px-8 py-7 font-body">
      <LocationFields
        addressText={addressText}
        setAddressText={setAddressText}
        district={district}
        setDistrict={setDistrict}
        location={loc.location}
        locating={loc.locating}
        locationError={loc.locationError}
        onUseCurrentLocation={loc.useCurrentLocation}
        onPick={loc.setLocation}
      />
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-[1_1_160px] flex-col gap-1.5 text-[13px]">
          處置日期
          <input type="date" value={observedDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setObservedDate(e.target.value)} className="min-h-11 border-[1.5px] border-ink bg-paper px-2.5 text-[15px]" />
        </label>
        <label className="flex flex-[1_1_140px] flex-col gap-1.5 text-[13px]">
          時間
          <input type="time" value={observedTime} onChange={(e) => setObservedTime(e.target.value)} className="min-h-11 border-[1.5px] border-ink bg-paper px-2.5 text-[15px]" />
        </label>
      </div>

      <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
        <legend className="mb-1 p-0 font-heading text-xl font-black">場所類型</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-[15px]">
          {PLACE_TYPES.map((p) => (
            <label key={p.value} className="flex min-h-11 cursor-pointer items-center gap-2">
              <input type="radio" name="placeType" checked={placeType === p.value} onChange={() => setPlaceType(p.value)} className="m-0 h-[18px] w-[18px] accent-ink" />
              {p.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
        <legend className="mb-1 p-0 font-heading text-xl font-black">
          本次行動 <span className="font-body text-[13px] font-normal text-[#4A463C]">（可複選，同一次到場做的事都勾選）</span>
        </legend>
        <ChipGroup options={BAIT_ACTIONS} selected={actions} onToggle={toggleAction} />
        {actions.has("removed") && (
          <p className="m-0 border-[1.5px] border-ink bg-activity-l1 px-3 py-2.5 text-[13px]">
            「移除」只記錄這次處置完成。地圖上不會顯示為安全，現場仍可能有殘餌、其他來源的藥餌或中毒鼠隻。
          </p>
        )}
      </fieldset>

      {needsProduct && (
        <fieldset className="m-0 flex flex-col gap-3 border-[1.5px] border-ink bg-paper px-5 py-[18px]">
          <legend className="px-1.5 font-heading text-lg font-black">
            藥劑資訊 <span className="font-body text-[13px] font-normal text-[#4A463C]">（投放餌劑時必填）</span>
          </legend>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
            <label className="flex flex-col gap-1.5 text-[13px]">
              產品名稱
              <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} className="min-h-11 border-[1.5px] border-ink bg-card px-2.5 text-[15px]" />
            </label>
            <label className="flex flex-col gap-1.5 text-[13px]">
              藥劑種類（必填）
              <select value={productType} onChange={(e) => setProductType(e.target.value as typeof productType)} className="min-h-11 border-[1.5px] border-ink bg-card px-2.5 text-[15px]">
                <option value="">請選擇</option>
                <option value="rodenticide">殺鼠劑</option>
                <option value="contraceptive">生育控制</option>
                <option value="other">其他</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-[13px]">
              有效成分
              <input type="text" value={activeIngredient} onChange={(e) => setActiveIngredient(e.target.value)} className="min-h-11 border-[1.5px] border-ink bg-card px-2.5 text-[15px]" />
            </label>
            <label className="flex flex-col gap-1.5 text-[13px]">
              許可證字號
              <input type="text" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} className="min-h-11 border-[1.5px] border-ink bg-card px-2.5 text-[15px]" />
            </label>
          </div>
        </fieldset>
      )}

      <label className="flex flex-col gap-1.5 font-heading text-base font-black">
        連結鼠跡調查 <span className="font-body text-[13px] font-normal text-[#4A463C]">（選填）</span>
        <input type="text" value={linkedOfficialObservationId} onChange={(e) => setLinkedOfficialObservationId(e.target.value)} placeholder="調查文件 ID" className="min-h-11 border-[1.5px] border-ink bg-paper px-3 font-label text-base tracking-[0.06em]" />
      </label>
      <label className="flex flex-col gap-1.5 font-heading text-base font-black">
        連結市民通報 <span className="font-body text-[13px] font-normal text-[#4A463C]">（選填）</span>
        <input type="text" value={linkedCitizenReportId} onChange={(e) => setLinkedCitizenReportId(e.target.value)} placeholder="通報文件 ID" className="min-h-11 border-[1.5px] border-ink bg-paper px-3 font-label text-base tracking-[0.06em]" />
      </label>
      <label className="flex flex-col gap-1.5 font-heading text-base font-black">
        備註 <span className="font-body text-[13px] font-normal text-[#4A463C]">（選填）</span>
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="例如：餌站已上鎖，外側補貼警示。" className="border-[1.5px] border-ink bg-paper px-3 py-2.5 font-body text-[15px] font-normal" />
      </label>

      <PhotoPicker photos={photoUploads.photos} onSelect={handlePhotoSelect} onRemove={photoUploads.removePhoto} />

      {error && <p className="m-0 border-[1.5px] border-ink bg-activity-l1 px-3.5 py-3 text-[13px]">{error}</p>}

      <div className="flex justify-end gap-3 border-t-2 border-ink pt-4">
        <button type="submit" disabled={submitting} className="min-h-[52px] border-2 border-ink bg-ink px-10 font-heading text-base font-bold text-card disabled:opacity-60">
          {submitting ? "送出中…" : "新增投藥紀錄"}
        </button>
      </div>
    </form>
  );
}

function ChipGroup<T extends string>({
  options,
  selected,
  onToggle,
}: {
  options: { value: T; label: string }[];
  selected: Set<T>;
  onToggle: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = selected.has(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(o.value)}
            className={`min-h-11 rounded-full border-[1.5px] border-ink px-4 text-sm font-medium ${active ? "bg-accent" : "bg-paper"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
