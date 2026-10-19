// Tipos partilhados dos componentes admin (cliente)

export type AppointmentRowData = {
  id: string;
  reference: string;
  customerName: string;
  customerPhone: string;
  service: string;
  professional: string;
  serviceId: string;
  professionalId: string;
  startAtISO: string;
  endAtISO: string;
  status: string;
  priceAtBooking: number;
  notes: string | null;
  cancelReason: string | null;
};