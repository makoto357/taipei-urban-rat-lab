import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addDoc, collection, serverTimestamp, Timestamp } from "firebase/firestore";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";
import { useAuth } from "../features/auth/AuthProvider";
import { db } from "../lib/firebase";
import { LocationPicker } from "../features/map/LocationPicker";
import { usePhotoUploads, type PhotoUpload } from "../features/report/usePhotoUploads";
import { photoFileError, isObservedAtReasonable } from "../features/report/validation";
import { DISTRICTS, REPORT_STEPS, REPORT_TYPE_LABEL, SAFETY_NOTE, type ReportType } from "../features/report/steps";

interface LocationState {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
}

/**
 * 通報頁對應 Claude Artifact Report.dc.html：未登入時顯示 gate，登入後是
 * 三步驟表單，送出後寫入真正的 Firestore `citizenReports` 文件並顯示完成畫面。
 * 照片走 Cloud Storage staging 上傳 + apps/functions processUpload 的真實管線
 * （見 features/report/usePhotoUploads）。地點步驟還沒有接 MapLibre（Phase 6），
 * 先用「使用目前位置」（瀏覽器 Geolocation）取得座標、手動輸入地址與行政區；
 * 地圖為 MapLibre＋OSM 點擊／拖曳選點，反向地理編碼與正式 tile provider 留到 Phase 6。
 */
export function ReportPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [reportType, setReportType] = useState<ReportType | null>(null);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<LocationState | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [addressText, setAddressText] = useState("");
  const [district, setDistrict] = useState("");
  const [observedDate, setObservedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [observedTime, setObservedTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedReportId, setSubmittedReportId] = useState<string | null>(null);

  const photoUploads = usePhotoUploads(user?.uid ?? null);

  const signedIn = Boolean(user);
  const canNextStep1 = reportType !== null;
  const canNextStep2 = location !== null && addressText.trim() !== "" && district !== "";
  const canNext = step === 1 ? canNextStep1 : step === 2 ? canNextStep2 : true;

  function useCurrentLocation() {
    setLocationError(null);
    if (!("geolocation" in navigator)) {
      setLocationError("這個瀏覽器不支援定位，請手動輸入地址。");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
        });
        setLocating(false);
      },
      () => {
        setLocationError("無法取得目前位置，請確認已允許定位權限，或手動輸入地址。");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  function handlePhotoSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const error = photoFileError(file);
    if (error) {
      setSubmitError(error);
      return;
    }
    void photoUploads.addPhoto(file);
  }

  async function handleSubmit() {
    if (!user || !reportType || !location || submitting) return;
    if (!photoUploads.allSettled) {
      setSubmitError("照片還在處理中，請稍候再送出。");
      return;
    }
    const observedAt = new Date(`${observedDate}T${observedTime}:00`);
    if (Number.isNaN(observedAt.getTime())) {
      setSubmitError("觀察日期或時間格式不正確。");
      return;
    }
    if (!isObservedAtReasonable(observedAt)) {
      setSubmitError("觀察日期／時間不能是未來的時間。");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const reference = await addDoc(collection(db, "citizenReports"), {
        reporterId: user.uid,
        observedAt: Timestamp.fromDate(observedAt),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        reportType,
        location: { latitude: location.latitude, longitude: location.longitude },
        addressText: addressText.trim(),
        district,
        ...(description.trim() ? { description: description.trim() } : {}),
        photoPaths: photoUploads.cleanStoragePaths,
        schemaVersion: 1,
      });
      setSubmittedReportId(reference.id);
    } catch {
      setSubmitError("送出失敗，請確認網路連線後再試一次。");
    } finally {
      setSubmitting(false);
    }
  }

  function restart() {
    setStep(1);
    setAgreed(false);
    setSubmittedReportId(null);
    setReportType(null);
    setDescription("");
    setLocation(null);
    setAddressText("");
    setDistrict("");
    setSubmitError(null);
  }

  if (loading) return null;

  const done = submittedReportId !== null;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-container flex-col gap-7 px-10 pb-16 pt-8">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-2 border-b-2 border-ink pb-5">
          <div>
            <p className="m-0 mb-1.5 text-[15px] font-bold text-accent-text">
              鼠跡通報 <span className="font-label font-normal tracking-[0.1em]">/ REPORT</span>
            </p>
            <h1 className="m-0 text-[46px] font-black leading-[1.2]">發現鼠跡？告訴我們。</h1>
          </div>
          <p className="m-0 mb-2 text-[15px] leading-[1.7]">三個步驟完成通報。你的觀察可以幫助我們掌握都市環境的鼠跡狀況。</p>
        </div>

        <div className="flex flex-wrap items-start gap-x-12 gap-y-8">
          <StepList step={done ? 4 : step} />

          <div className="min-w-0 flex-[999_1_560px] max-w-[720px]">
            {!signedIn ? (
              <GateCard onStart={() => navigate("/login")} />
            ) : done ? (
              <DoneCard reportType={reportType} reportId={submittedReportId} onRestart={restart} />
            ) : (
              <ReportForm
                step={step}
                reportType={reportType}
                setReportType={setReportType}
                description={description}
                setDescription={setDescription}
                photos={photoUploads.photos}
                onPhotoSelect={handlePhotoSelect}
                onRemovePhoto={photoUploads.removePhoto}
                location={location}
                locating={locating}
                locationError={locationError}
                onUseCurrentLocation={useCurrentLocation}
                setLocation={setLocation}
                addressText={addressText}
                setAddressText={setAddressText}
                district={district}
                setDistrict={setDistrict}
                observedDate={observedDate}
                setObservedDate={setObservedDate}
                observedTime={observedTime}
                setObservedTime={setObservedTime}
                agreed={agreed}
                setAgreed={setAgreed}
                canNext={canNext}
                submitting={submitting}
                submitError={submitError}
                allPhotosSettled={photoUploads.allSettled}
                onNext={() => setStep((s) => s + 1)}
                onBack={() => setStep((s) => s - 1)}
                onSubmit={handleSubmit}
              />
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function StepList({ step }: { step: number }) {
  return (
    <ol aria-label="通報步驟" className="m-0 flex max-w-[320px] flex-1 flex-col list-none p-0" style={{ flexBasis: "240px" }}>
      {REPORT_STEPS.map((s, i) => {
        const n = i + 1;
        const isDone = n < step;
        const active = n === step;
        const bg = active ? "bg-accent" : isDone ? "bg-ink" : "bg-card";
        const fg = isDone ? "text-card" : "text-ink";
        return (
          <li key={s.title} aria-current={active ? "step" : undefined} className="flex gap-3.5">
            <div className="flex flex-col items-center">
              <span
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-ink font-label text-[15px] ${bg} ${fg}`}
              >
                {String(n).padStart(2, "0")}
              </span>
              {i < REPORT_STEPS.length - 1 && <span aria-hidden="true" className="h-[30px] w-[1.5px] bg-ink" />}
            </div>
            <div className="pt-1.5">
              <p className="m-0 text-[17px] font-black">{s.title}</p>
              <p className="m-0 mt-0.5 font-body text-xs text-[#4A463C]">{s.desc}</p>
            </div>
          </li>
        );
      })}
      <li className="mt-6 border-[1.5px] border-ink bg-card px-3.5 py-3 font-body text-xs leading-[1.7]">
        通報需要登入，才能讓你之後查看處理狀態。
      </li>
    </ol>
  );
}

function GateCard({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative flex aspect-[16/11] flex-col items-center justify-center gap-6 overflow-hidden border-2 border-ink bg-card">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" aria-hidden="true" className="absolute inset-0">
        <line x1="0" y1="0" x2="100" y2="100" stroke="#000000" strokeWidth="0.25" />
        <line x1="100" y1="0" x2="0" y2="100" stroke="#000000" strokeWidth="0.25" />
      </svg>
      <svg width="72" height="72" viewBox="0 0 90 90" fill="none" aria-hidden="true" className="relative rounded-full bg-card">
        <path d="M55.2273 32.7273C55.2273 27.0789 50.6484 22.5 45 22.5C39.3516 22.5 34.7727 27.0789 34.7727 32.7273C34.7727 38.3756 39.3516 42.9545 45 42.9545V51.1364C34.8329 51.1364 26.5909 42.8943 26.5909 32.7273C26.5909 22.5602 34.8329 14.3182 45 14.3182C55.1671 14.3182 63.4091 22.5602 63.4091 32.7273C63.4091 42.8943 55.1671 51.1364 45 51.1364V42.9545C50.6484 42.9545 55.2273 38.3756 55.2273 32.7273Z" fill="#000000" />
        <path d="M45 42.9545C52.6157 42.9545 59.9736 45.2997 65.3786 51.2243C70.7375 57.0985 73.6364 65.9027 73.6364 77.7273H65.4545C65.4545 67.1407 62.8589 60.6033 59.3342 56.7394C55.8555 52.9262 50.9402 51.1364 45 51.1364C39.0598 51.1364 34.1445 52.9262 30.6658 56.7394C27.1411 60.6033 24.5455 67.1407 24.5455 77.7273H16.3636C16.3636 65.9027 19.2625 57.0985 24.6214 51.2243C30.0264 45.2997 37.3843 42.9545 45 42.9545Z" fill="#000000" />
        <path d="M81.8182 45C81.8182 24.6659 65.3341 8.18182 45 8.18182C24.6659 8.18182 8.18182 24.6659 8.18182 45C8.18182 65.3341 24.6659 81.8182 45 81.8182V90C20.1472 90 0 69.8528 0 45C0 20.1472 20.1472 0 45 0C69.8528 0 90 20.1472 90 45C90 69.8528 69.8528 90 45 90V81.8182C65.3341 81.8182 81.8182 65.3341 81.8182 45Z" fill="#000000" />
      </svg>
      <p className="relative m-0 bg-card px-3 text-center font-body text-[15px]">登入後即可開始填寫通報。</p>
      <button
        type="button"
        onClick={onStart}
        className="relative min-h-12 border-2 border-ink bg-ink px-7 font-heading text-base font-bold text-card"
      >
        登入開始填表
      </button>
    </div>
  );
}

function ReportForm({
  step,
  reportType,
  setReportType,
  description,
  setDescription,
  photos,
  onPhotoSelect,
  onRemovePhoto,
  location,
  locating,
  locationError,
  onUseCurrentLocation,
  setLocation,
  addressText,
  setAddressText,
  district,
  setDistrict,
  observedDate,
  setObservedDate,
  observedTime,
  setObservedTime,
  agreed,
  setAgreed,
  canNext,
  submitting,
  submitError,
  allPhotosSettled,
  onNext,
  onBack,
  onSubmit,
}: {
  step: number;
  reportType: ReportType | null;
  setReportType: (t: ReportType) => void;
  description: string;
  setDescription: (v: string) => void;
  photos: PhotoUpload[];
  onPhotoSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: (mediaId: string) => void;
  location: LocationState | null;
  locating: boolean;
  locationError: string | null;
  onUseCurrentLocation: () => void;
  setLocation: (l: LocationState) => void;
  addressText: string;
  setAddressText: (v: string) => void;
  district: string;
  setDistrict: (v: string) => void;
  observedDate: string;
  setObservedDate: (v: string) => void;
  observedTime: string;
  setObservedTime: (v: string) => void;
  agreed: boolean;
  setAgreed: (v: boolean) => void;
  canNext: boolean;
  submitting: boolean;
  submitError: string | null;
  allPhotosSettled: boolean;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const typeLabel = reportType ? REPORT_TYPE_LABEL[reportType] : REPORT_TYPE_LABEL.rat;
  const canSubmit = agreed && allPhotosSettled && !submitting;

  return (
    <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-6 border-2 border-ink bg-card px-8 py-7">
      {step === 1 && (
        <section className="flex flex-col gap-[18px]">
          <h2 className="m-0 text-[26px] font-black">1. 通報類型與照片</h2>
          <fieldset className="m-0 flex min-w-0 flex-col gap-2.5 border-0 p-0">
            <legend className="mb-2.5 p-0 text-base font-bold">你看到的是什麼？</legend>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3 font-body">
              <ReportTypeCard
                active={reportType === "rat"}
                title="看到老鼠／鼠跡"
                description="活鼠、死鼠、排泄物、咬痕或鼠洞"
                onSelect={() => setReportType("rat")}
              />
              <ReportTypeCard
                active={reportType === "bait"}
                title="看到餌劑／餌站"
                description="餌盒、散放藥餌或警示標示"
                onSelect={() => setReportType("bait")}
              />
            </div>
          </fieldset>
          <div role="note" className="flex items-start gap-3 border-[1.5px] border-ink bg-activity-l1 px-3.5 py-3 font-body text-[13px] leading-[1.7]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth={2} aria-hidden="true" className="mt-0.5 flex-none">
              <path d="M12 3 L22 20 H2 Z" strokeLinejoin="round" />
              <path d="M12 10v5M12 17.5v.5" />
            </svg>
            <p className="m-0">{SAFETY_NOTE[reportType ?? "rat"]}</p>
          </div>
          <div className="flex flex-col gap-2.5">
            <p className="m-0 text-base font-bold">
              照片 <span className="font-body text-[13px] font-normal text-[#4A463C]">（選填，最多 3 張；JPEG／PNG／WebP，每張 8 MB 以內）</span>
            </p>
            <div className="grid grid-cols-3 gap-3 font-body">
              {photos.map((photo) => (
                <PhotoTile key={photo.mediaId} photo={photo} onRemove={() => onRemovePhoto(photo.mediaId)} />
              ))}
              {photos.length < 3 && (
                <label className="relative flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 border-2 border-dashed border-ink bg-paper text-center">
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth={1.8} aria-hidden="true">
                    <rect x="3" y="6" width="18" height="14" rx="1" />
                    <circle cx="12" cy="13" r="3.5" />
                    <path d="M8 6 L9.5 3.5 H14.5 L16 6" />
                  </svg>
                  <span className="text-sm font-medium">拍照或選擇照片</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={onPhotoSelect}
                    className="absolute h-px w-px opacity-0"
                  />
                </label>
              )}
            </div>
            <p className="m-0 font-body text-xs text-[#4A463C]">上傳失敗時可以重試；照片處理完成前無法送出通報。</p>
          </div>
          <label className="flex flex-col gap-2 text-base font-bold">
            描述 <span className="font-body text-[13px] font-normal text-[#4A463C]">（選填）</span>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例如：晚上在巷口垃圾集中處看到一隻老鼠跑進水溝"
              className="rounded-none border-[1.5px] border-ink bg-paper px-3 py-2.5 font-body text-[15px] font-normal leading-[1.6]"
            />
          </label>
        </section>
      )}

      {step === 2 && (
        <section className="flex flex-col gap-3.5">
          <h2 className="m-0 text-[26px] font-black">2. 地點</h2>
          <div className="flex flex-wrap gap-2.5">
            <label className="flex min-h-11 flex-[1_1_280px] items-center gap-2.5 border-[1.5px] border-ink bg-paper px-3 font-body">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth={2} aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M16.5 16.5 L21 21" />
              </svg>
              <span className="sr-only">輸入地址或地標</span>
              <input
                type="text"
                value={addressText}
                onChange={(e) => setAddressText(e.target.value)}
                placeholder="輸入地址或地標"
                className="min-w-0 flex-1 border-0 bg-transparent text-[15px] outline-none"
              />
            </label>
            <label className="flex min-h-11 flex-[1_1_160px] items-center border-[1.5px] border-ink bg-paper px-3 font-body">
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full border-0 bg-transparent text-[15px] outline-none"
              >
                <option value="">選擇行政區</option>
                {DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={onUseCurrentLocation}
              disabled={locating}
              className="inline-flex min-h-11 items-center gap-2 border-[1.5px] border-ink bg-card px-4 font-heading text-[15px] font-bold disabled:opacity-60"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth={2} aria-hidden="true">
                <circle cx="12" cy="12" r="7" />
                <circle cx="12" cy="12" r="2.5" fill="#000000" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              </svg>
              {locating ? "定位中…" : "使用目前位置"}
            </button>
          </div>
          <LocationPicker
            value={location}
            onChange={(picked) => setLocation({ ...picked, accuracyMeters: null })}
          />
          {locationError && (
            <p className="m-0 border-[1.5px] border-ink bg-activity-l1 px-3.5 py-3 font-body text-[13px] leading-[1.6]">
              {locationError}
            </p>
          )}
          <div className="flex flex-wrap justify-between gap-x-4 gap-y-1.5 font-body text-[13px]">
            <p className="m-0">
              <strong className="font-medium">地址：</strong>
              {addressText || "尚未輸入"}・{district || "尚未選擇行政區"}
            </p>
            {location && (
              <p className="m-0 text-[#4A463C]">
                座標：{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
                {location.accuracyMeters !== null && `（精度約 ±${Math.round(location.accuracyMeters)} 公尺）`}
              </p>
            )}
          </div>
          <p className="m-0 font-body text-xs text-[#4A463C]">你確認地點前，我們不會送出任何定位資料。</p>
        </section>
      )}

      {step === 3 && (
        <section className="flex flex-col gap-[18px]">
          <h2 className="m-0 text-[26px] font-black">3. 日期與確認</h2>
          <div className="flex flex-wrap gap-3 font-body">
            <label className="flex flex-[1_1_160px] flex-col gap-1.5 text-[13px]">
              觀察日期
              <input
                type="date"
                value={observedDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setObservedDate(e.target.value)}
                className="min-h-11 border-[1.5px] border-ink bg-paper px-2.5 text-[15px]"
              />
            </label>
            <label className="flex flex-[1_1_140px] flex-col gap-1.5 text-[13px]">
              大約時間
              <input
                type="time"
                value={observedTime}
                onChange={(e) => setObservedTime(e.target.value)}
                className="min-h-11 border-[1.5px] border-ink bg-paper px-2.5 text-[15px]"
              />
            </label>
          </div>
          <dl className="m-0 grid grid-cols-[96px_1fr] gap-x-4 gap-y-2.5 border-[1.5px] border-ink bg-paper px-[18px] py-4 font-body text-sm">
            <dt className="font-medium">類型</dt>
            <dd className="m-0">{typeLabel}</dd>
            <dt className="font-medium">照片</dt>
            <dd className="m-0">{photos.length > 0 ? `${photos.length} 張` : "無"}</dd>
            <dt className="font-medium">地點</dt>
            <dd className="m-0">
              {addressText}・{district}
            </dd>
          </dl>
          <div className="flex flex-col gap-2.5 border-2 border-ink bg-card px-[18px] py-4">
            <p className="m-0 text-base font-black">公開方式</p>
            <ul className="m-0 list-disc pl-5 font-body text-[13px] leading-[1.8]">
              <li>通報先經人工審核，通過後才會顯示在公開地圖上。</li>
              <li>公開時會顯示精確點位；若位於私人住宅或可能辨識住戶，會改以區域顯示。</li>
              <li>照片會移除拍攝位置等資訊，並遮蔽可辨識的人臉、門牌或車牌。</li>
              <li>你的帳號資料不會公開。</li>
            </ul>
            <label className="flex min-h-11 cursor-pointer items-center gap-2.5 font-body text-sm font-medium">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="m-0 h-5 w-5 accent-ink" />
              我了解公開方式
            </label>
          </div>
          {submitError && (
            <p className="m-0 border-[1.5px] border-ink bg-activity-l1 px-3.5 py-3 font-body text-[13px] leading-[1.6]">
              {submitError}
            </p>
          )}
        </section>
      )}

      <div className="flex flex-wrap justify-between gap-3 border-t-2 border-ink pt-4">
        {step > 1 && (
          <button
            type="button"
            onClick={onBack}
            className="min-h-[52px] border-2 border-ink bg-card px-7 font-heading text-base font-bold"
          >
            ← 上一步
          </button>
        )}
        <span className="flex-1" />
        {step < 3 && (
          <button
            type="button"
            onClick={onNext}
            disabled={!canNext}
            className={`min-h-[52px] border-2 px-10 font-heading text-base font-bold ${
              canNext ? "border-ink bg-ink text-card" : "cursor-not-allowed border-unknown bg-unknown text-muted"
            }`}
          >
            下一步 →
          </button>
        )}
        {step === 3 && (
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            className={`min-h-[52px] border-2 px-10 font-heading text-base font-bold ${
              canSubmit ? "border-ink bg-ink text-card" : "cursor-not-allowed border-unknown bg-unknown text-muted"
            }`}
          >
            {submitting ? "送出中…" : "送出通報"}
          </button>
        )}
      </div>
    </form>
  );
}

function PhotoTile({ photo, onRemove }: { photo: PhotoUpload; onRemove: () => void }) {
  const label =
    photo.status === "uploading"
      ? `上傳中 ${photo.progress}%`
      : photo.status === "processing"
        ? "處理中…"
        : photo.status === "clean"
          ? "上傳完成"
          : photo.status === "rejected"
            ? "照片未通過檢查"
            : "上傳失敗";

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={`relative flex aspect-square flex-col items-center justify-center gap-2 border-[1.5px] p-2 text-center ${
          photo.status === "rejected" || photo.status === "upload_error"
            ? "border-accent-text bg-paper"
            : "border-ink bg-unknown"
        }`}
      >
        {photo.status === "uploading" && (
          <div
            role="progressbar"
            aria-label={`${photo.fileName} 上傳進度`}
            aria-valuenow={photo.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2 w-full border border-ink bg-card"
          >
            <div className="h-full bg-ink" style={{ width: `${photo.progress}%` }} />
          </div>
        )}
        {photo.status === "processing" && <span className="text-xs text-[#4A463C]">處理中…</span>}
        {(photo.status === "rejected" || photo.status === "upload_error") && (
          <span className="text-[13px] font-bold text-accent-text">{label}</span>
        )}
        {photo.status === "clean" && <span className="text-xs text-[#4A463C]">已處理完成</span>}
        <button
          type="button"
          onClick={onRemove}
          aria-label={`移除 ${photo.fileName}`}
          className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full border-[1.5px] border-ink bg-card text-lg leading-none"
        >
          ×
        </button>
      </div>
      <p className="m-0 flex items-center justify-between text-xs">{label}</p>
    </div>
  );
}

function ReportTypeCard({
  active,
  title,
  description,
  onSelect,
}: {
  active: boolean;
  title: string;
  description: string;
  onSelect: () => void;
}) {
  return (
    <label className={`flex items-start gap-3 border-2 border-ink p-4 ${active ? "bg-activity-l1" : "bg-paper"}`}>
      <input type="radio" name="reportType" checked={active} onChange={onSelect} className="mt-0.5 h-5 w-5 flex-none accent-ink" />
      <span className="flex flex-col gap-1">
        <span className="font-heading text-lg font-black">{title}</span>
        <span className="text-[13px] leading-[1.6] text-[#4A463C]">{description}</span>
      </span>
    </label>
  );
}

function DoneCard({
  reportType,
  reportId,
  onRestart,
}: {
  reportType: ReportType | null;
  reportId: string | null;
  onRestart: () => void;
}) {
  return (
    <div className="flex flex-col gap-[18px] border-2 border-ink bg-card px-9 py-10">
      <p className="m-0 font-label text-[14px] tracking-[0.1em] text-accent-text">REPORT RECEIVED</p>
      <h2 className="m-0 text-[32px] font-black">已收到你的通報，謝謝。</h2>
      <dl className="m-0 grid grid-cols-[96px_1fr] gap-x-4 gap-y-2.5 font-body text-[15px]">
        <dt className="font-medium">通報類型</dt>
        <dd className="m-0">{reportType ? REPORT_TYPE_LABEL[reportType] : REPORT_TYPE_LABEL.rat}</dd>
        <dt className="font-medium">通報編號</dt>
        <dd className="m-0 font-label text-lg tracking-[0.06em]">{reportId ?? "—"}</dd>
        <dt className="font-medium">目前狀態</dt>
        <dd className="m-0">
          <span className="border-[1.5px] border-ink bg-activity-l1 px-2.5 py-0.5 text-[13px]">待審核</span>
        </dd>
      </dl>
      <p className="m-0 font-body text-sm leading-[1.8]">
        審核通過後，這筆通報才會出現在公開地圖上。公開前，照片會移除拍攝位置等資訊，並遮蔽可辨識的人臉、門牌或車牌。
      </p>
      <div className="mt-2 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onRestart}
          className="min-h-12 border-2 border-ink bg-card px-6 font-heading text-base font-bold"
        >
          再通報一筆
        </button>
      </div>
    </div>
  );
}
