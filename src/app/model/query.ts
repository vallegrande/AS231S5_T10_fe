export interface QueryRecord {
  id: string;
  pregunta: string;  // Corresponde a 'pregunta' del backend
  respuesta: string; // Corresponde a 'respuesta' del backend
  fecha: string;     // Corresponde a 'fecha' del backend, que el backend envía como String (ISO 8601)
  status: string;
}