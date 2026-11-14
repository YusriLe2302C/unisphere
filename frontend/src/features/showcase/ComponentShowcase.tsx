import { useState } from 'react';
import {
  ArrowUpRight,
  Bell,
  BookOpen,
  ChevronDown,
  CircleHelp,
  Download,
  Plus,
  Search,
  Settings,
  Trash2,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '../../app/providers/useToast';
import './showcase.css';
import {
  Avatar,
  Badge,
  Breadcrumbs,
  Button,
  Card,
  Checkbox,
  ConfirmationDialog,
  Dropdown,
  DropdownItem,
  Drawer,
  EmptyState,
  ErrorState,
  FileUpload,
  FormField,
  IconButton,
  Input,
  Label,
  Modal,
  Pagination,
  ProgressBar,
  Radio,
  SearchInput,
  Select,
  Skeleton,
  Spinner,
  StatCard,
  Switch,
  Table,
  Tabs,
  Textarea,
  Tooltip,
} from '../../components/ui';

interface ShowcaseRow {
  id: string;
  label: string;
}

export function ComponentShowcase() {
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(3);
  const { notify } = useToast();

  return (
    <main className="us-showcase">
      <header className="us-showcase-header">
        <Breadcrumbs items={[{ label: 'Development', href: '/' }, { label: 'Design system' }]} />
        <Link to="/" className="us-showcase-back">
          Back to portal <ArrowUpRight size={15} />
        </Link>
        <p className="us-showcase-kicker">RNS INSTITUTE OF TECHNOLOGY · UNISPHERE</p>
        <h1>Design system</h1>
        <p className="us-showcase-intro">
          A shared visual language and accessible components for the UniSphere college portal.
        </p>
      </header>

      <section className="us-showcase-section" aria-labelledby="tokens-title">
        <div className="us-showcase-title">
          <div>
            <span>FOUNDATION</span>
            <h2 id="tokens-title">Color palette</h2>
          </div>
        </div>
        <div className="us-token-grid">
          {[
            ['Burgundy', 'var(--us-color-burgundy)', '#6D1D36'],
            ['Dark burgundy', 'var(--us-color-burgundy-dark)', '#481326'],
            ['Burgundy hover', 'var(--us-color-burgundy-hover)', '#852846'],
            ['Light burgundy', 'var(--us-color-burgundy-light)', '#F5E8ED'],
            ['Ivory', 'var(--us-color-ivory)', '#FFF8F0'],
            ['Primary text', 'var(--us-color-primary-text)', '#21151A'],
            ['Secondary text', 'var(--us-color-secondary-text)', '#75666D'],
            ['Border', 'var(--us-color-border)', '#E8DDE1'],
            ['Success', 'var(--us-color-success)', '#16A34A'],
            ['Warning', 'var(--us-color-warning)', '#EAB308'],
            ['Orange', 'var(--us-color-orange)', '#F97316'],
            ['Critical', 'var(--us-color-critical)', '#DC2626'],
          ].map(([name, color, hex]) => (
            <div className="us-token-swatch" key={name}>
              <span style={{ background: color }} />
              <span>
                <strong>{name}</strong>
                <small>{hex}</small>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="us-showcase-section" aria-labelledby="buttons-title">
        <div className="us-showcase-title">
          <div>
            <span>INTERACTION</span>
            <h2 id="buttons-title">Buttons and icons</h2>
          </div>
        </div>
        <Card className="us-showcase-card">
          <div className="us-showcase-row">
            <Button leadingIcon={<Plus size={16} />}>Primary action</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger" leadingIcon={<Trash2 size={15} />}>
              Remove
            </Button>
          </div>
          <div className="us-showcase-row">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button loading>Saving</Button>
            <Button disabled>Disabled</Button>
            <IconButton label="Notifications">
              <Bell size={17} />
            </IconButton>
            <IconButton label="Settings" variant="outline">
              <Settings size={17} />
            </IconButton>
            <Tooltip content="Accessible tooltip">
              <IconButton label="Help">
                <CircleHelp size={17} />
              </IconButton>
            </Tooltip>
          </div>
        </Card>
      </section>

      <section className="us-showcase-section" aria-labelledby="forms-title">
        <div className="us-showcase-title">
          <div>
            <span>INPUT</span>
            <h2 id="forms-title">Form controls</h2>
          </div>
        </div>
        <Card className="us-showcase-card">
          <div className="us-showcase-form-grid">
            <FormField
              label="Full name"
              htmlFor="showcase-name"
              required
              hint="Use the name associated with your campus profile."
            >
              <Input id="showcase-name" placeholder="Your name" />
            </FormField>
            <FormField label="Institution" htmlFor="showcase-institution">
              <Select id="showcase-institution" defaultValue="">
                <option value="" disabled>
                  Select an institution
                </option>
                <option>RNS Institute of Technology</option>
              </Select>
            </FormField>
            <FormField label="Search people" htmlFor="showcase-search">
              <SearchInput
                id="showcase-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onClear={() => setSearch('')}
                placeholder="Name, department, or role"
              />
            </FormField>
            <FormField label="Message" htmlFor="showcase-message" hint="Keep it clear and concise.">
              <Textarea id="showcase-message" placeholder="Write a message…" rows={3} />
            </FormField>
          </div>
          <div className="us-showcase-row us-showcase-choice-row">
            <Checkbox label="Email me campus updates" defaultChecked />
            <Radio name="showcase-preference" label="Student" defaultChecked />
            <Radio name="showcase-preference" label="Faculty" />
            <Switch checked={enabled} onChange={setEnabled} label="Notifications" />
          </div>
          <div className="us-showcase-row">
            <Label htmlFor="standalone-control">Standalone label</Label>
            <Input id="standalone-control" placeholder="Labeled input" />
            <Button variant="outline" leadingIcon={<Download size={15} />}>
              Export
            </Button>
          </div>
        </Card>
      </section>

      <section className="us-showcase-section" aria-labelledby="display-title">
        <div className="us-showcase-title">
          <div>
            <span>CONTENT</span>
            <h2 id="display-title">Cards, badges, and avatars</h2>
          </div>
        </div>
        <div className="us-showcase-grid">
          <Card className="us-showcase-card">
            <div className="us-showcase-row">
              <Badge>Draft</Badge>
              <Badge variant="brand" dot>
                Review
              </Badge>
              <Badge variant="success" dot>
                Published
              </Badge>
              <Badge variant="warning">Pending</Badge>
              <Badge variant="orange">New</Badge>
              <Badge variant="critical">Attention</Badge>
              <Badge variant="outline">Archived</Badge>
            </div>
            <div className="us-showcase-row us-avatar-row">
              <Avatar name="RNS Institute" size="xs" />
              <Avatar name="UniSphere Member" size="sm" />
              <Avatar name="Campus Community" size="md" />
              <Avatar name="Faculty Member" size="lg" />
              <Avatar name="RNS Institute" size="xl" />
            </div>
          </Card>
          <StatCard label="Active members" value="—" icon={<Users size={18} />} />
          <StatCard label="Profile completion" value="—" icon={<BookOpen size={18} />} />
        </div>
      </section>

      <section className="us-showcase-section" aria-labelledby="navigation-title">
        <div className="us-showcase-title">
          <div>
            <span>NAVIGATION</span>
            <h2 id="navigation-title">Menus, tabs, and pagination</h2>
          </div>
        </div>
        <Card className="us-showcase-card">
          <div className="us-showcase-row">
            <Dropdown
              label={
                <>
                  Actions <ChevronDown size={15} />
                </>
              }
            >
              <DropdownItem onSelect={() => notify('Edit action selected', 'info')}>
                Edit details
              </DropdownItem>
              <DropdownItem onSelect={() => notify('Download action selected', 'success')}>
                Download
              </DropdownItem>
              <DropdownItem destructive onSelect={() => notify('Remove action selected', 'error')}>
                Remove item
              </DropdownItem>
            </Dropdown>
            <Tabs
              label="Showcase sections"
              tabs={[
                {
                  id: 'overview',
                  label: 'Overview',
                  content: <p>Tabs support arrow keys, Home, and End for keyboard navigation.</p>,
                },
                {
                  id: 'details',
                  label: 'Details',
                  content: <p>Use tabs to switch between related views.</p>,
                },
                {
                  id: 'disabled',
                  label: 'Unavailable',
                  content: <p>Unavailable</p>,
                  disabled: true,
                },
              ]}
            />
          </div>
          <div className="us-showcase-block">
            <Pagination page={page} totalPages={7} onPageChange={setPage} />
          </div>
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Community', href: '/app/community' },
              { label: 'Members' },
            ]}
          />
        </Card>
      </section>

      <section className="us-showcase-section" aria-labelledby="feedback-title">
        <div className="us-showcase-title">
          <div>
            <span>FEEDBACK</span>
            <h2 id="feedback-title">Progress and states</h2>
          </div>
        </div>
        <Card className="us-showcase-card">
          <div className="us-showcase-progress">
            <ProgressBar label="Profile completion" value={68} showValue />
            <ProgressBar label="Successful uploads" value={100} tone="success" />
            <ProgressBar label="Review status" value={42} tone="warning" />
          </div>
          <div className="us-showcase-row">
            <Spinner label="Loading content" />
            <Skeleton width={120} />
            <Skeleton width={180} height={20} />
            <Skeleton width={36} height={36} circle />
          </div>
          <div className="us-showcase-grid">
            <EmptyState
              icon={<Search size={19} />}
              title="No results found"
              description="Try adjusting your search terms."
            />
            <ErrorState
              title="Could not load this view"
              description="Check your connection and try again."
              onRetry={() => notify('Retry requested', 'info')}
            />
          </div>
        </Card>
      </section>

      <section className="us-showcase-section" aria-labelledby="table-title">
        <div className="us-showcase-title">
          <div>
            <span>DATA</span>
            <h2 id="table-title">Table and file upload</h2>
          </div>
        </div>
        <Card className="us-showcase-card">
          <Table<ShowcaseRow>
            caption="Empty design system example table"
            columns={[
              { key: 'label', header: 'Name', render: (row) => row.label },
              {
                key: 'status',
                header: 'Status',
                render: () => <Badge variant="outline">—</Badge>,
                align: 'right',
              },
            ]}
            rows={[]}
            emptyMessage="No rows to show in this preview."
          />
          <div className="us-showcase-block">
            <FileUpload
              onFilesSelected={(files) =>
                notify(`${files.length} file${files.length === 1 ? '' : 's'} selected`, 'success')
              }
              onError={(message) => notify(message, 'error')}
              accept="image/*,.pdf"
              multiple
            />
          </div>
        </Card>
      </section>

      <section className="us-showcase-section" aria-labelledby="overlay-title">
        <div className="us-showcase-title">
          <div>
            <span>OVERLAYS</span>
            <h2 id="overlay-title">Modal, drawer, and confirmation</h2>
          </div>
        </div>
        <Card className="us-showcase-card">
          <div className="us-showcase-row">
            <Button onClick={() => setModalOpen(true)}>Open modal</Button>
            <Button variant="outline" onClick={() => setDrawerOpen(true)}>
              Open drawer
            </Button>
            <Button variant="danger" onClick={() => setConfirmOpen(true)}>
              Open confirmation
            </Button>
            <Button
              variant="ghost"
              onClick={() => notify('This is a shared toast notification.', 'success')}
            >
              Show toast
            </Button>
          </div>
        </Card>
      </section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="A focused dialog"
        description="Native dialog behavior keeps keyboard focus inside while open."
        footer={<Button onClick={() => setModalOpen(false)}>Done</Button>}
      >
        <p className="us-demo-copy">
          Dialogs close with Escape, the close action, or a backdrop click.
        </p>
      </Modal>
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Side panel"
        description="A responsive drawer for secondary tasks."
        footer={<Button onClick={() => setDrawerOpen(false)}>Close panel</Button>}
      >
        <p className="us-demo-copy">On small screens the drawer fills the viewport width.</p>
      </Drawer>
      <ConfirmationDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          notify('Confirmation completed.', 'success');
        }}
        title="Confirm this action?"
        description="This is a preview of the reusable confirmation dialog."
        confirmLabel="Confirm action"
      />
    </main>
  );
}
