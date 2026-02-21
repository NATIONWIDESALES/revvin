import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SEOHead from "@/components/SEOHead";
import { User, Trophy, Star, Send, MapPin, Calendar, ArrowLeft, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }),
};

const ReferrerProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ total: 0, won: 0, successRate: 0 });
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const fetch = async () => {
      const [profileRes, referralsRes, badgesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("referrals").select("id, status").eq("referrer_id", userId),
        supabase.from("user_badges").select("*, badges(*)").eq("user_id", userId),
      ]);
      setProfile(profileRes.data);
      const refs = referralsRes.data ?? [];
      const won = refs.filter(r => r.status === "won").length;
      setStats({ total: refs.length, won, successRate: refs.length > 0 ? Math.round((won / refs.length) * 100) : 0 });
      setBadges(badgesRes.data ?? []);
      setLoading(false);
    };
    fetch();
  }, [userId]);

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  if (!profile) {
    return (
      <div className="py-20 text-center">
        <User className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
        <h2 className="font-display text-xl font-bold">Referrer not found</h2>
        <Button asChild className="mt-4" variant="outline"><Link to="/browse">Browse Offers</Link></Button>
      </div>
    );
  }

  const memberSince = new Date(profile.created_at).toLocaleDateString("default", { month: "long", year: "numeric" });

  return (
    <div className="py-8">
      <SEOHead title={`${profile.full_name || "Referrer"} — Revvin Profile`} description={`View ${profile.full_name || "this referrer"}'s profile, stats, and badges on Revvin.`} path={`/referrer/${userId}`} />
      <div className="container max-w-3xl">
        <Button variant="ghost" size="sm" className="mb-6 gap-1" asChild>
          <Link to="/browse"><ArrowLeft className="h-4 w-4" /> Back</Link>
        </Button>

        <motion.div initial="hidden" animate="visible">
          {/* Profile Header */}
          <motion.div variants={fadeUp} custom={0} className="rounded-2xl border border-border bg-card p-8 text-center mb-6">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name} className="h-20 w-20 rounded-full object-cover" />
              ) : (
                (profile.full_name || "?").charAt(0).toUpperCase()
              )}
            </div>
            <h1 className="font-display text-2xl font-bold">{profile.full_name || "Anonymous Referrer"}</h1>
            {(profile.city || profile.state) && (
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
                <MapPin className="h-3.5 w-3.5" /> {[profile.city, profile.state].filter(Boolean).join(", ")}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
              <Calendar className="h-3 w-3" /> Member since {memberSince}
            </p>
            {profile.bio && <p className="mt-4 text-sm text-muted-foreground max-w-md mx-auto">{profile.bio}</p>}
          </motion.div>

          {/* Stats */}
          <motion.div variants={fadeUp} custom={1} className="grid grid-cols-3 gap-4 mb-6">
            <div className="rounded-2xl border border-border bg-card p-5 text-center">
              <Send className="mx-auto mb-2 h-5 w-5 text-primary" />
              <p className="font-display text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Referrals</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 text-center">
              <CheckCircle2 className="mx-auto mb-2 h-5 w-5 text-earnings" />
              <p className="font-display text-2xl font-bold">{stats.won}</p>
              <p className="text-xs text-muted-foreground">Deals Closed</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 text-center">
              <Trophy className="mx-auto mb-2 h-5 w-5 text-accent-foreground" />
              <p className="font-display text-2xl font-bold">{stats.successRate}%</p>
              <p className="text-xs text-muted-foreground">Success Rate</p>
            </div>
          </motion.div>

          {/* Badges */}
          <motion.div variants={fadeUp} custom={2} className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2"><Star className="h-5 w-5 text-accent-foreground" /> Badges</h2>
            {badges.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No badges earned yet</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {badges.map((ub: any) => (
                  <div key={ub.id} className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
                    <Trophy className="h-5 w-5 text-accent-foreground" />
                    <div>
                      <p className="text-sm font-medium">{ub.badges?.name}</p>
                      <p className="text-xs text-muted-foreground">{ub.badges?.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default ReferrerProfile;