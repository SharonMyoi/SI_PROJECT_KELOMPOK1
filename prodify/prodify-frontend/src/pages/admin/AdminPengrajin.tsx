import { useMemo, useState } from "react";
import { useStore, formatRupiah } from "@/store/useStore";
import { PageHeader } from "@/components/prodify/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Award, Plus, Pencil, Trash2, Search, UserPlus } from "lucide-react";
import { Specialization, User } from "@/types";
import { toast } from "@/hooks/use-toast";

const ALL_SPEC: Specialization[] = [
  "Kepala", "Badan", "Tangan", "Kaki", "Tas", "Gantungan Kunci", "Aksesoris", "Perakitan",
];

type FormState = {
  name: string;
  username: string;
  password: string;
  specializations: Specialization[];
};

const emptyForm: FormState = { name: "", username: "", password: "", specializations: [] };

export default function AdminPengrajin() {
  const { users, orders, points, addUser, updateUser, deleteUser } = useStore();

  const [search, setSearch] = useState("");
  const [specFilter, setSpecFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "busy">("all");

  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);

  const busyMap = useMemo(() => {
    const m = new Map<string, number>();
    orders.forEach((o) =>
      o.subtasks.forEach((s) => {
        if (s.assignedTo && s.status === "On Progress") {
          m.set(s.assignedTo, (m.get(s.assignedTo) ?? 0) + 1);
        }
      })
    );
    return m;
  }, [orders]);

  const pengrajin = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter((u) => u.role === "pengrajin")
      .filter((u) => {
        if (!q) return true;
        return u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
      })
      .filter((u) => {
        if (specFilter === "all") return true;
        return u.specializations?.includes(specFilter as Specialization);
      })
      .filter((u) => {
        if (statusFilter === "all") return true;
        const isBusy = (busyMap.get(u.id) ?? 0) > 0;
        return statusFilter === "busy" ? isBusy : !isBusy;
      });
  }, [users, search, specFilter, statusFilter, busyMap]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpenForm(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setForm({
      name: u.name,
      username: u.username,
      password: u.password,
      specializations: u.specializations ?? [],
    });
    setOpenForm(true);
  };

  const toggleSpec = (s: Specialization) => {
    setForm((f) => ({
      ...f,
      specializations: f.specializations.includes(s)
        ? f.specializations.filter((x) => x !== s)
        : [...f.specializations, s],
    }));
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.username.trim() || !form.password.trim()) {
      toast({ title: "Lengkapi form", description: "Nama, username, dan password wajib diisi.", variant: "destructive" });
      return;
    }
    if (editing) {
      const res = updateUser(editing.id, {
        name: form.name,
        username: form.username,
        password: form.password,
        specializations: form.specializations,
      });
      if (!res.ok) {
        toast({ title: "Gagal menyimpan", description: res.message, variant: "destructive" });
        return;
      }
      toast({ title: "Tersimpan", description: `Data ${form.name} diperbarui.` });
    } else {
      const res = addUser({
        name: form.name,
        username: form.username,
        password: form.password,
        role: "pengrajin",
        specializations: form.specializations,
      });
      if (!res.ok) {
        toast({ title: "Gagal menambah", description: res.message, variant: "destructive" });
        return;
      }
      toast({ title: "Pengrajin ditambahkan", description: `${form.name} berhasil dibuat.` });
    }
    setOpenForm(false);
  };

  const handleDelete = () => {
    if (!confirmDelete) return;
    const res = deleteUser(confirmDelete.id);
    if (!res.ok) {
      toast({ title: "Tidak bisa menghapus", description: res.message, variant: "destructive" });
    } else {
      toast({ title: "Dihapus", description: `${confirmDelete.name} telah dihapus.` });
    }
    setConfirmDelete(null);
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        title="Daftar Pengrajin"
        description="Spesialisasi, status, dan total upah masing-masing pengrajin."
        actions={
          <Button onClick={openAdd} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Tambah Pengrajin
          </Button>
        }
      />

      {/* Filter bar */}
      <Card className="p-4 flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama atau username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={specFilter} onValueChange={setSpecFilter}>
          <SelectTrigger className="md:w-48"><SelectValue placeholder="Spesialisasi" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Spesialisasi</SelectItem>
            {ALL_SPEC.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="md:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="busy">Sibuk</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      {pengrajin.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          Tidak ada pengrajin yang cocok dengan filter.
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pengrajin.map((u) => {
            const busy = (busyMap.get(u.id) ?? 0) > 0;
            const earnings = points.filter((p) => p.userId === u.id).reduce((sum, p) => sum + p.point, 0);
            const completed = points.filter((p) => p.userId === u.id).length;
            return (
              <Card key={u.id} className="p-5 hover:shadow-[var(--shadow-card)] transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center font-bold text-primary-foreground text-lg shrink-0">
                      {u.name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-foreground truncate">{u.name}</p>
                      <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap",
                    busy ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success"
                  )}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", busy ? "bg-destructive" : "bg-success")} />
                    {busy ? `Sibuk (${busyMap.get(u.id)})` : "Available"}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-1 min-h-[22px]">
                  {u.specializations?.length ? u.specializations.map((s) => (
                    <span key={s} className="text-[11px] px-2 py-0.5 rounded-full bg-secondary/15 text-secondary font-medium">{s}</span>
                  )) : <span className="text-[11px] text-muted-foreground italic">Belum ada spesialisasi</span>}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-muted">
                    <p className="text-muted-foreground flex items-center gap-1"><Award className="h-3 w-3" /> Total Upah</p>
                    <p className="font-bold text-foreground mt-0.5">{formatRupiah(earnings)}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted">
                    <p className="text-muted-foreground">Task Selesai</p>
                    <p className="font-bold text-foreground mt-0.5">{completed}</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => openEdit(u)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setConfirmDelete(u)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Hapus
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Form dialog */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Pengrajin" : "Tambah Pengrajin"}</DialogTitle>
            <DialogDescription>
              {editing ? "Perbarui data pengrajin di bawah ini." : "Buat akun pengrajin baru."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nama Lengkap</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="cth: Siti Aminah" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input id="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="cth: siti" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min. 6 karakter" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Spesialisasi</Label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_SPEC.map((s) => {
                  const active = form.specializations.includes(s);
                  return (
                    <button
                      type="button"
                      key={s}
                      onClick={() => toggleSpec(s)}
                      className={cn(
                        "text-xs px-2.5 py-1 rounded-full border transition-colors",
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground/70 border-border hover:border-primary/50"
                      )}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenForm(false)}>Batal</Button>
            <Button onClick={handleSubmit} className="gap-2">
              {editing ? <><Pencil className="h-4 w-4" /> Simpan</> : <><Plus className="h-4 w-4" /> Tambah</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus pengrajin?</AlertDialogTitle>
            <AlertDialogDescription>
              Akun <strong>{confirmDelete?.name}</strong> akan dihapus secara permanen. Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Ya, hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}