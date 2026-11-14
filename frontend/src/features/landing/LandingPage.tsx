import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  FlaskConical,
  Globe2,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../app/providers/useAuth';

const areas = [
  {
    icon: BookOpen,
    title: 'Academics',
    detail: 'Stay in rhythm with your coursework and campus life.',
  },
  {
    icon: CalendarDays,
    title: 'Events',
    detail: 'Find the gatherings, talks, and moments worth showing up for.',
  },
  {
    icon: FlaskConical,
    title: 'Research',
    detail: 'Meet collaborators and move ideas into the world.',
  },
  {
    icon: BriefcaseBusiness,
    title: 'Career & placements',
    detail: 'Turn your next opportunity into a first step.',
  },
  {
    icon: Users,
    title: 'Community',
    detail: 'A closer campus starts with people who share your interests.',
  },
  {
    icon: Globe2,
    title: 'Alumni network',
    detail: 'Keep the connections you made here moving forward.',
  },
];

export function LandingPage() {
  const { isAuthenticated } = useAuth();
  return (
    <main>
      <section className="hero wrap">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-dot" /> THE CAMPUS, CONNECTED
          </div>
          <h1>
            Your next chapter <br />
            starts <span>on campus.</span>
          </h1>
          <p className="hero-description">
            The people, possibilities, and ideas that make college matter — all in one place.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" to={isAuthenticated ? '/app' : '/login'}>
              {isAuthenticated ? 'Open your workspace' : 'Get started'}
              <ArrowRight size={17} />
            </Link>
            <a className="text-link" href="#platform">
              Explore the platform <span>↓</span>
            </a>
          </div>
          <div className="hero-note">
            <span className="note-line" /> One community. Many possibilities.
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-grid" />
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="art-core">
            <div className="core-inner">
              <Globe2 size={54} strokeWidth={1.15} />
            </div>
          </div>
          <div className="orbit-node node-one">
            <BookOpen size={19} />
          </div>
          <div className="orbit-node node-two">
            <Users size={19} />
          </div>
          <div className="orbit-node node-three">
            <FlaskConical size={19} />
          </div>
          <div className="floating-note">
            <span className="floating-icon">
              <CalendarDays size={17} />
            </span>
            <span>
              <strong>Find your people</strong>
              <small>Community is closer than you think</small>
            </span>
            <span className="online-dot" />
          </div>
          <div className="art-caption">
            <span className="caption-dot" /> YOUR WORLD, IN ONE ORBIT
          </div>
        </div>
      </section>
      <section className="platform-section" id="platform">
        <div className="wrap">
          <div className="section-heading">
            <div>
              <div className="eyebrow">A LITTLE MORE CONNECTED</div>
              <h2>
                Everything campus
                <br />
                has to offer.
              </h2>
            </div>
            <p>
              From your first class to your next big idea, find the right people and opportunities
              along the way.
            </p>
          </div>
          <div className="area-grid">
            {areas.map(({ icon: Icon, title, detail }, index) => (
              <article className="area-card" key={title}>
                <span className={`area-icon area-icon-${index}`}>
                  <Icon size={20} strokeWidth={1.8} />
                </span>
                <h3>{title}</h3>
                <p>{detail}</p>
                <span className="area-arrow">
                  <ArrowRight size={16} />
                </span>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="closing-cta wrap">
        <div>
          <div className="eyebrow">YOUR CAMPUS IS WAITING</div>
          <h2>Make it yours.</h2>
        </div>
        <Link to={isAuthenticated ? '/app' : '/login'} className="button button-primary">
          {isAuthenticated ? 'Go to workspace' : 'Step inside'}
          <ArrowRight size={17} />
        </Link>
      </section>
    </main>
  );
}
