import { useEffect, useState } from "react";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { BaitRecordSchema, CitizenReportSchema, OfficialObservationSchema } from "@taipei-rat-lab/contracts";
import { db } from "../../lib/firebase";
import { FETCH_LIMIT, type OverviewData, type WithId } from "./overviewStats";

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; data: OverviewData };

async function load<T>(
  name: string,
  orderField: string,
  schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } },
): Promise<WithId<T>[]> {
  const snapshot = await getDocs(query(collection(db, name), orderBy(orderField, "desc"), limit(FETCH_LIMIT)));
  return snapshot.docs.flatMap((doc) => {
    const parsed = schema.safeParse(doc.data());
    return parsed.success ? [{ id: doc.id, data: parsed.data }] : [];
  });
}

/** 官方總覽資料：Rules 只允許 official／admin 讀這三個集合；單欄位排序不需要複合索引。 */
export function useOverviewData(): State {
  const [state, setState] = useState<State>({ status: "loading" });
  useEffect(() => {
    let live = true;
    Promise.all([
      load("citizenReports", "createdAt", CitizenReportSchema),
      load("officialObservations", "observedAt", OfficialObservationSchema),
      load("baitRecords", "updatedAt", BaitRecordSchema),
    ]).then(
      ([reports, observations, baitRecords]) => live && setState({ status: "ready", data: { reports, observations, baitRecords } }),
      () => live && setState({ status: "error" }),
    );
    return () => {
      live = false;
    };
  }, []);
  return state;
}
