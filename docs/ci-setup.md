# CI／部署設定（dev）

`.github/workflows/ci.yml`：

- **Pull request**：跑 `check`（typecheck、單元測試、Rules 測試、web／functions build）與 `e2e`。
- **push 到 `main`（= PR 合併）**：兩者通過後才部署到 `taipei-urban-rat-lab-dev`。Hosting 每次都部署；
  Functions 只在 `apps/functions`／`packages/contracts` 有變動時部署；Rules 只在 `firebase/` 的規則檔有變動時部署。
- 不啟用 PR 預覽站：預覽站會連到同一個 dev 後端，測試會污染資料。

## 一次性設定

以專案 Owner 帳號（`makoto357@gmail.com`）執行。

### 1. GCP：部署用服務帳戶與 Workload Identity（不存金鑰檔）

```bash
PROJECT_ID=taipei-urban-rat-lab-dev
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
SA=github-deployer@$PROJECT_ID.iam.gserviceaccount.com
REPO=makoto357/taipei-urban-rat-lab

gcloud services enable iamcredentials.googleapis.com sts.googleapis.com cloudresourcemanager.googleapis.com --project $PROJECT_ID
gcloud iam service-accounts create github-deployer --display-name="GitHub Actions deployer" --project $PROJECT_ID

for ROLE in roles/firebasehosting.admin roles/cloudfunctions.admin roles/firebaserules.admin \
  roles/iam.serviceAccountUser roles/artifactregistry.writer roles/run.admin roles/cloudbuild.builds.editor; do
  gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$SA" --role="$ROLE" --condition=None
done

gcloud iam workload-identity-pools create github --location=global --project $PROJECT_ID
gcloud iam workload-identity-pools providers create-oidc github-provider \
  --location=global --workload-identity-pool=github --project $PROJECT_ID \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='$REPO'"
gcloud iam service-accounts add-iam-policy-binding $SA --project $PROJECT_ID \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/$REPO"
```

第一次部署 Functions 若缺權限，依錯誤訊息補角色。

### 2. GitHub：`dev` Environment 與 Variables

Firebase client 設定是公開值（不是 Secret），值取自 `apps/web/.env.local`。**不要**設定 `VITE_DEV_PREFILL_*`。

```bash
gh api -X PUT repos/$REPO/environments/dev
gh variable set GCP_WORKLOAD_IDENTITY_PROVIDER --env dev --body "projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/github-provider"
gh variable set GCP_DEPLOY_SERVICE_ACCOUNT --env dev --body "$SA"
for NAME in API_KEY AUTH_DOMAIN PROJECT_ID STORAGE_BUCKET MESSAGING_SENDER_ID APP_ID; do
  gh variable set VITE_FIREBASE_$NAME --env dev --body "<apps/web/.env.local 裡的值>"
done
```

### 3. GitHub：`main` 分支保護（要求 PR，不要求 approve）

- 必須經由 PR 合併（含管理員）。
- 必須通過 `check` 與 `e2e` 兩個 status check，且分支需與 `main` 同步。
- 不要求 approve 數量。

## 之後要補的
- 正式（prod）專案：另建 Environment，設定 required reviewers，不要沿用 dev 的自動部署。
- 若日後啟用 PR 預覽，需先建立獨立的 staging Firebase 專案（預覽站不可連 dev 後端）。
