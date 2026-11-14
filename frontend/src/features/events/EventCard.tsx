import { ArrowUpRight, CalendarDays, MapPin, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '../../components/ui';
import type { CampusEvent } from '../../services/events/event-api';
import {
  formatEventDate,
  getEventImage,
  getOrganizerLabel,
  getRegistrationAvailability,
} from './event-format';

export function EventCard({ event }: { event: CampusEvent }) {
  const image = getEventImage(event);
  const availability = getRegistrationAvailability(event);
  return (
    <article className="event-card">
      <Link
        to={`/app/events/${encodeURIComponent(event._id)}`}
        className="event-card-image-link"
        aria-label={`View details for ${event.title}`}
      >
        {image ? (
          <img className="event-card-image" src={image} alt="" loading="lazy" />
        ) : (
          <div className="event-card-image-fallback">
            <CalendarDays size={25} />
            <span>{event.category || 'Campus event'}</span>
          </div>
        )}
      </Link>
      <div className="event-card-body">
        <div className="event-card-tags">
          <Badge variant={availability.tone} size="sm" dot>
            {availability.label}
          </Badge>
          {event.category && (
            <Badge variant="outline" size="sm">
              {event.category}
            </Badge>
          )}
        </div>
        <h2>
          <Link to={`/app/events/${encodeURIComponent(event._id)}`}>{event.title}</Link>
        </h2>
        <p className="event-card-description">{event.description}</p>
        <div className="event-card-meta">
          <span>
            <CalendarDays size={14} />
            {formatEventDate(event.startDate, { hour: 'numeric', minute: '2-digit' })}
          </span>
          <span>
            <MapPin size={14} />
            {event.venue || (event.mode === 'online' ? 'Online' : 'Venue not specified')}
          </span>
          <span>
            <UsersRound size={14} />
            {getOrganizerLabel(event)}
          </span>
        </div>
        <Link className="event-card-link" to={`/app/events/${encodeURIComponent(event._id)}`}>
          View details <ArrowUpRight size={15} />
        </Link>
      </div>
    </article>
  );
}
