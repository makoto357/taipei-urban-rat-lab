import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  onIdTokenChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  type User,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { MembershipSchema, type Membership } from "@taipei-rat-lab/contracts";
import { auth, db } from "../../lib/firebase";

/**
 * Auth state for the whole app. Firestore Security Rules (not this context) are
 * the real authorization boundary — this only drives what the UI shows. See
 * plan.md §2–3 and firebase/firestore.rules.
 */
interface AuthState {
  user: User | null;
  /** 從 memberships/{uid} 讀到的 role/status；還在載入或沒有文件時為 null。 */
  membership: Membership | null;
  /** 已登入但 memberships/{uid} 第一次快照還沒回來。 */
  membershipLoading: boolean;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  signInWithGoogle: () => Promise<User>;
  signInWithEmail: (email: string, password: string) => Promise<User>;
  signUpWithEmail: (email: string, password: string) => Promise<User>;
  resendVerificationEmail: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [resolvedUid, setResolvedUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // custom claims（role）變動後，token 會更新，這裡一併重新同步。
  useEffect(() => onIdTokenChanged(auth, (nextUser) => setUser(nextUser)), []);

  useEffect(() => {
    if (!user) {
      setMembership(null);
      setResolvedUid(null);
      return;
    }
    const unsubscribe = onSnapshot(
      doc(db, "memberships", user.uid),
      (snapshot) => {
        const parsed = snapshot.exists() ? MembershipSchema.safeParse(snapshot.data()) : null;
        setMembership(parsed?.success ? parsed.data : null);
        setResolvedUid(user.uid);
      },
      () => {
        setMembership(null);
        setResolvedUid(user.uid);
      },
    );
    return unsubscribe;
  }, [user?.uid]);

  const membershipLoading = user !== null && resolvedUid !== user.uid;
  // 換帳號時，上一位使用者的 membership 在新快照回來前不能被當成目前使用者的。
  const currentMembership = membershipLoading ? null : membership;

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      membership: currentMembership,
      membershipLoading,
      loading,
      async signInWithGoogle() {
        const credential = await signInWithPopup(auth, new GoogleAuthProvider());
        return credential.user;
      },
      async signInWithEmail(email, password) {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        return credential.user;
      },
      async signUpWithEmail(email, password) {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(credential.user);
        return credential.user;
      },
      async resendVerificationEmail() {
        if (auth.currentUser) await sendEmailVerification(auth.currentUser);
      },
      async signOut() {
        await firebaseSignOut(auth);
      },
    }),
    [user, currentMembership, membershipLoading, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
