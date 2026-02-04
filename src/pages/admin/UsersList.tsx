import React, { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, useChangePassword } from '@/hooks/useUsers';
import { useForms } from '@/hooks/useForms';
import { useAuth } from '@/contexts/AuthContext';
import type { User, CreateUserPayload, UpdateUserPayload } from '@/types';
import { Plus, Pencil, Trash2, Key, Users, Shield, UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const UsersList: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { data: users, isLoading } = useUsers();
  const { data: formsData } = useForms(1, 100);
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const changePassword = useChangePassword();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'user' as 'admin' | 'user',
    form_ids: [] as string[],
  });

  const [passwordData, setPasswordData] = useState({
    new_password: '',
    confirm_password: '',
  });

  const forms = formsData?.data || [];

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      name: '',
      role: 'user',
      form_ids: [],
    });
  };

  const handleCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: '',
      name: user.name,
      role: user.role,
      form_ids: user.assigned_forms?.map(f => f.id) || [],
    });
    setIsEditOpen(true);
  };

  const handlePasswordChange = (user: User) => {
    setSelectedUser(user);
    setPasswordData({ new_password: '', confirm_password: '' });
    setIsPasswordOpen(true);
  };

  const handleDelete = (user: User) => {
    setSelectedUser(user);
    setIsDeleteOpen(true);
  };

  const handleSubmitCreate = async () => {
    if (!formData.email || !formData.password || !formData.name) return;

    const payload: CreateUserPayload = {
      email: formData.email,
      password: formData.password,
      name: formData.name,
      role: formData.role,
      form_ids: formData.role === 'user' ? formData.form_ids : undefined,
    };

    await createUser.mutateAsync(payload);
    setIsCreateOpen(false);
    resetForm();
  };

  const handleSubmitEdit = async () => {
    if (!selectedUser || !formData.email || !formData.name) return;

    const payload: UpdateUserPayload = {
      email: formData.email,
      name: formData.name,
      role: formData.role,
      form_ids: formData.role === 'user' ? formData.form_ids : undefined,
    };

    await updateUser.mutateAsync({ id: selectedUser.id, data: payload });
    setIsEditOpen(false);
    setSelectedUser(null);
  };

  const handleSubmitPassword = async () => {
    if (!selectedUser) return;
    if (passwordData.new_password !== passwordData.confirm_password) {
      return;
    }
    if (passwordData.new_password.length < 6) {
      return;
    }

    await changePassword.mutateAsync({
      id: selectedUser.id,
      data: { new_password: passwordData.new_password },
    });
    setIsPasswordOpen(false);
    setSelectedUser(null);
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;
    await deleteUser.mutateAsync(selectedUser.id);
    setIsDeleteOpen(false);
    setSelectedUser(null);
  };

  const toggleFormSelection = (formId: string) => {
    setFormData(prev => ({
      ...prev,
      form_ids: prev.form_ids.includes(formId)
        ? prev.form_ids.filter(id => id !== formId)
        : [...prev.form_ids, formId],
    }));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
            <p className="text-muted-foreground">
              Gerencie usuários e permissões de acesso
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Usuário
          </Button>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Lista de Usuários
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role === 'admin' ? (
                            <><Shield className="mr-1 h-3 w-3" /> Admin</>
                          ) : (
                            <><UserIcon className="mr-1 h-3 w-3" /> Usuário</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePasswordChange(user)}
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {user.id !== currentUser?.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(user)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create User Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>
              Crie um novo usuário para acessar o sistema
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Tipo de Usuário</Label>
              <Select
                value={formData.role}
                onValueChange={(value: 'admin' | 'user') => setFormData(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador (acesso total)</SelectItem>
                  <SelectItem value="user">Usuário (acesso restrito)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.role === 'user' && (
              <div className="space-y-2">
                <Label>Formulários Permitidos</Label>
                <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                  {forms.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum formulário criado</p>
                  ) : (
                    forms.map((form) => (
                      <div key={form.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`form-${form.id}`}
                          checked={formData.form_ids.includes(form.id)}
                          onCheckedChange={() => toggleFormSelection(form.id)}
                        />
                        <label
                          htmlFor={`form-${form.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {form.name}
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitCreate} disabled={createUser.isPending}>
              {createUser.isPending ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Altere as informações do usuário
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Tipo de Usuário</Label>
              <Select
                value={formData.role}
                onValueChange={(value: 'admin' | 'user') => setFormData(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador (acesso total)</SelectItem>
                  <SelectItem value="user">Usuário (acesso restrito)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.role === 'user' && (
              <div className="space-y-2">
                <Label>Formulários Permitidos</Label>
                <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                  {forms.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum formulário criado</p>
                  ) : (
                    forms.map((form) => (
                      <div key={form.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-form-${form.id}`}
                          checked={formData.form_ids.includes(form.id)}
                          onCheckedChange={() => toggleFormSelection(form.id)}
                        />
                        <label
                          htmlFor={`edit-form-${form.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {form.name}
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitEdit} disabled={updateUser.isPending}>
              {updateUser.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
            <DialogDescription>
              Defina uma nova senha para {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova Senha</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordData.new_password}
                onChange={(e) => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Senha</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordData.confirm_password}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))}
                placeholder="Repita a senha"
              />
            </div>
            {passwordData.new_password && passwordData.confirm_password && passwordData.new_password !== passwordData.confirm_password && (
              <p className="text-sm text-destructive">As senhas não coincidem</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitPassword}
              disabled={
                changePassword.isPending ||
                passwordData.new_password !== passwordData.confirm_password ||
                passwordData.new_password.length < 6
              }
            >
              {changePassword.isPending ? 'Alterando...' : 'Alterar Senha'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário "{selectedUser?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default UsersList;
