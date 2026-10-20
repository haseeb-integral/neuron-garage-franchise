import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsManager } from "@/hooks/dbHealth/useIsManager";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

/** Company mailing address printed in every cold email footer (CAN-SPAM). */
export function CompanyMailingAddressCard() {
  const { isAdmin, loading: roleLoading } = useIsManager();
  const [address, setAddress] = useState("");
  const [saved, setSaved] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("company_settings")
      .select("mailing_address")
      .eq("id", true)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) toast.error("Could not load the mailing address.");
        const v = data?.mailing_address ?? "";
        setAddress(v);
        setSaved(v);
        setLoading(false);
      });
  }, []);

  const save = async () => {
    const v = address.trim();
    if (!v) return toast.error("Type the full mailing address first.");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("company_settings")
      .upsert({ id: true, mailing_address: v, updated_by: u.user?.id ?? null, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) return toast.error("Could not save. Only admins can change the address.");
    setSaved(v);
    setAddress(v);
    toast.success("Mailing address saved.");
  };

  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <div className="flex items-center gap-2">
        <MapPin size={13} className="text-primary" />
        <span className="text-xs font-black">Company Mailing Address</span>
        {!loading && (
          <span className={`text-[10px] ${saved ? "text-muted-foreground" : "text-destructive font-semibold"}`}>
            {saved ? "Saved" : "Not set — campaigns can't launch"}
          </span>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        The law (CAN-SPAM) says every cold email must show a real business mailing address. This address goes in each email footer.
      </p>
      <Textarea
        rows={2}
        value={address}
        disabled={loading || roleLoading || !isAdmin}
        placeholder="Street, City, State ZIP"
        onChange={(e) => setAddress(e.target.value)}
      />
      {isAdmin ? (
        <Button size="sm" onClick={save} disabled={saving || loading || address.trim() === saved}>
          {saving ? "Saving…" : "Save"}
        </Button>
      ) : (
        !roleLoading && <p className="text-[10px] text-muted-foreground">Only admins can change this.</p>
      )}
    </div>
  );
}
