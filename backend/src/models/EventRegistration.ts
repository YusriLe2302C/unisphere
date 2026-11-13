import mongoose, { Document, Schema, Types } from 'mongoose';

export type RegistrationStatus = 'registered' | 'waitlisted' | 'cancelled' | 'attended';

export interface ITeamMember {
  userId: Types.ObjectId;
  name: string;
  email: string;
  role?: string;
}

export interface IEventRegistration extends Document {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  userId: Types.ObjectId;
  status: RegistrationStatus;
  registeredAt: Date;
  teamName?: string;
  teamMembers: ITeamMember[];
  seatsAllocated: number;
  attendanceMarked: boolean;
  attendedAt?: Date;
  ticketCode: string;
  waitlistPosition?: number;
  cancelledAt?: Date;
  cancelledReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TeamMemberSchema = new Schema<ITeamMember>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, default: 'Member' }
  },
  { _id: false }
);

const EventRegistrationSchema = new Schema<IEventRegistration>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['registered', 'waitlisted', 'cancelled', 'attended'],
      default: 'registered',
      index: true
    },
    registeredAt: { type: Date, default: Date.now },
    teamName: { type: String, default: '' },
    teamMembers: { type: [TeamMemberSchema], default: [] },
    seatsAllocated: { type: Number, default: 1, min: 1 },
    attendanceMarked: { type: Boolean, default: false },
    attendedAt: { type: Date },
    ticketCode: { type: String, required: true },
    waitlistPosition: { type: Number },
    cancelledAt: { type: Date },
    cancelledReason: { type: String, default: '' }
  },
  { timestamps: true }
);

// Retain cancelled records for idempotent retries while allowing a user to re-register.
EventRegistrationSchema.index(
  { eventId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['registered', 'waitlisted', 'attended'] } } }
);
EventRegistrationSchema.index({ eventId: 1, status: 1 });
EventRegistrationSchema.index({ ticketCode: 1 }, { unique: true });

export const EventRegistration = mongoose.model<IEventRegistration>(
  'EventRegistration',
  EventRegistrationSchema
);
