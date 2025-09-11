import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Key, 
  Activity, 
  Settings,
  Plus,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  Globe,
  Zap,
  Webhook
} from 'lucide-react';
import { 
  useApiKeys, 
  useApiRequestLogs, 
  useCreateApiKey, 
  useUpdateApiKey, 
  useDeleteApiKey 
} from '@/hooks/useApiKeys';
import {
  useIntegrations,
  useIntegrationSyncLogs,
  useCreateIntegration,
  useTestIntegration,
  useSyncIntegration
} from '@/hooks/useIntegrations';
import {
  useWebhookSubscriptions,
  useWebhookEvents,
  useCreateWebhookSubscription,
  useTriggerWebhook
} from '@/hooks/useWebhooks';

export function ApiDashboard() {
  const [selectedTab, setSelectedTab] = useState('api-keys');
  const [isCreateKeyOpen, setIsCreateKeyOpen] = useState(false);
  const [isCreateIntegrationOpen, setIsCreateIntegrationOpen] = useState(false);
  const [isCreateWebhookOpen, setIsCreateWebhookOpen] = useState(false);

  const { data: apiKeys, isLoading: keysLoading } = useApiKeys();
  const { data: requestLogs } = useApiRequestLogs();
  const { data: integrations, isLoading: integrationsLoading } = useIntegrations();
  const { data: webhookSubscriptions } = useWebhookSubscriptions();
  const { data: webhookEvents } = useWebhookEvents();

  const createApiKey = useCreateApiKey();
  const updateApiKey = useUpdateApiKey();
  const deleteApiKey = useDeleteApiKey();
  const testIntegration = useTestIntegration();
  const triggerWebhook = useTriggerWebhook();

  if (keysLoading || integrationsLoading) {
    return <div className="flex items-center justify-center h-64">Caricamento...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">API & Integrazioni</h1>
          <p className="text-muted-foreground">Gestisci API pubbliche, integrazioni esterne e webhooks</p>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="api-keys" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Integrazioni
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            Webhooks
          </TabsTrigger>
        </TabsList>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Chiavi API</h2>
            <Dialog open={isCreateKeyOpen} onOpenChange={setIsCreateKeyOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuova Chiave API
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crea Nuova Chiave API</DialogTitle>
                  <DialogDescription>
                    Crea una nuova chiave API per accedere alle tue risorse programmaticamente.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      placeholder="Es: Mobile App, Integration Service"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="permissions">Permessi</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona permessi" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="documents:read">Documenti - Lettura</SelectItem>
                        <SelectItem value="documents:write">Documenti - Scrittura</SelectItem>
                        <SelectItem value="expenses:read">Spese - Lettura</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="rateLimit">Rate Limit (richieste/ora)</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="1000" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="1000">1000</SelectItem>
                        <SelectItem value="10000">10000</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => {
                      createApiKey.mutate({
                        name: 'Test API Key',
                        permissions: ['documents:read'],
                        rate_limit_per_hour: 1000
                      });
                      setIsCreateKeyOpen(false);
                    }}
                  >
                    Crea Chiave
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {apiKeys?.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Key className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nessuna chiave API</h3>
                  <p className="text-muted-foreground text-center">
                    Crea la tua prima chiave API per iniziare ad utilizzare le nostre API pubbliche.
                  </p>
                </CardContent>
              </Card>
            ) : (
              apiKeys?.map((key) => (
                <Card key={key.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{key.name}</CardTitle>
                        <CardDescription>
                          Creata il {new Date(key.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={key.is_active ? 'default' : 'secondary'}>
                          {key.is_active ? 'Attiva' : 'Inattiva'}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteApiKey.mutate(key.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Prefisso:</span>
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {key.key_prefix}***
                        </code>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Rate Limit:</span>
                        <span className="text-sm">{key.rate_limit_per_hour} req/ora</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Ultimo utilizzo:</span>
                        <span className="text-sm">
                          {key.last_used_at 
                            ? new Date(key.last_used_at).toLocaleDateString()
                            : 'Mai utilizzata'
                          }
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Integrazioni Esterne</h2>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuova Integrazione
            </Button>
          </div>

          <div className="grid gap-4">
            {integrations?.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Zap className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nessuna integrazione</h3>
                  <p className="text-muted-foreground text-center">
                    Configura integrazioni con ERP, banche, DocuSign e servizi email.
                  </p>
                </CardContent>
              </Card>
            ) : (
              integrations?.map((integration) => (
                <Card key={integration.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{integration.name}</CardTitle>
                        <CardDescription>
                          {integration.provider} - {integration.type}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={integration.is_active ? 'default' : 'secondary'}>
                          {integration.is_active ? 'Attiva' : 'Inattiva'}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testIntegration.mutate(integration.id)}
                        >
                          Test
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Stato:</span>
                        <Badge variant={integration.sync_status === 'success' ? 'default' : 'secondary'}>
                          {integration.sync_status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Ultima sincronizzazione:</span>
                        <span className="text-sm">
                          {integration.last_sync_at 
                            ? new Date(integration.last_sync_at).toLocaleDateString()
                            : 'Mai sincronizzata'
                          }
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Gestione Webhooks</h2>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Webhook
            </Button>
          </div>

          <div className="grid gap-4">
            {webhookSubscriptions?.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Webhook className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nessun webhook configurato</h3>
                  <p className="text-muted-foreground text-center">
                    Configura webhooks per ricevere notifiche in tempo reale sui tuoi sistemi esterni.
                  </p>
                </CardContent>
              </Card>
            ) : (
              webhookSubscriptions?.map((webhook) => (
                <Card key={webhook.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{webhook.name}</CardTitle>
                        <CardDescription>
                          {webhook.endpoint_url}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={webhook.is_active ? 'default' : 'secondary'}>
                          {webhook.is_active ? 'Attivo' : 'Inattivo'}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => triggerWebhook.mutate({
                            eventType: 'test.event',
                            data: { message: 'Test webhook' }
                          })}
                        >
                          Test
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Eventi:</span>
                        <span className="text-sm">{webhook.events.join(', ')}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Max retry:</span>
                        <span className="text-sm">{webhook.max_retries}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Ultima consegna:</span>
                        <span className="text-sm">
                          {webhook.last_delivered_at 
                            ? new Date(webhook.last_delivered_at).toLocaleDateString()
                            : 'Nessuna consegna'
                          }
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}