import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators'; // 'map' ya no se usa para transformación de nombres
import { environment } from '../environments/environment';
import { QueryRecord } from '../model/query'; // Importa la interfaz QueryRecord TAL CUAL la definiste

@Injectable({
  providedIn: 'root'
})
export class QueryRecordService {
  // La URL base de tu backend Spring Boot
  private baseUrl = environment.URL_IA;
  // Duración del tiempo de espera para las peticiones HTTP
  private timeoutDuration = 30000; // 30 segundos

  constructor(private http: HttpClient) {}

  /**
   * Configura las cabeceras HTTP para las peticiones.
   * @param contentType El tipo de contenido de la petición ('text/plain' o 'application/json').
   * @returns HttpHeaders configuradas.
   */
  private getHeaders(contentType: 'text/plain' | 'application/json' = 'text/plain'): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': contentType,
      'Accept': 'application/json'
    });
  }

  /**
   * Maneja los errores de las peticiones HTTP de forma centralizada.
   * @param error El objeto HttpErrorResponse.
   * @returns Un observable con el error a lanzar.
   */
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Ocurrió un error en la solicitud.';

    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente o de red
      errorMessage = `Error del cliente: ${error.error.message}`;
    } else if (error.status === 0) {
      // Error de conexión al servidor
      errorMessage = 'No se pudo conectar al servidor. Por favor, revise su conexión.';
    } else if (error.status === 404) {
      // Recurso no encontrado
      errorMessage = 'El recurso solicitado no fue encontrado.';
    } else if (error.status === 500) {
      // Error interno del servidor
      errorMessage = 'Error interno del servidor. Por favor, intente de nuevo más tarde.';
    } else {
      // Otros errores del servidor
      errorMessage = `Error del servidor: ${error.status}, mensaje: ${error.message}`;
    }

    console.error('Error detallado:', error);
    return throwError(() => new Error(errorMessage));
  }

  /**
   * Crea una nueva interacción con la IA enviando una pregunta al backend.
   * El backend se encargará de ejecutar la consulta y guardarla.
   * @param query La pregunta a enviar a la IA.
   * @returns Un Observable con el registro de la interacción creada (QueryRecord).
   */
  createInteraction(query: string): Observable<QueryRecord> {
    // El backend espera la pregunta como un RequestParam, por lo que se añade a la URL.
    // El tipo de retorno del http.post es QueryRecord directamente.
    return this.http.post<QueryRecord>(`${this.baseUrl}?pregunta=${encodeURIComponent(query)}`, {}, {
      headers: this.getHeaders('text/plain')
    }).pipe(
      timeout(this.timeoutDuration),
      catchError(this.handleError)
      // Ya no hay map para transformación de nombres aquí, ya que QueryRecord coincide con el backend.
    );
  }

  /**
   * Recupera todos los registros de interacción con la IA.
   * @returns Un Observable con un array de registros de interacción (QueryRecord[]).
   */
  getAllQueryRecords(): Observable<QueryRecord[]> {
    // El tipo de retorno del http.get es QueryRecord[] directamente.
    return this.http.get<QueryRecord[]>(`${this.baseUrl}`).pipe(
      timeout(this.timeoutDuration),
      catchError(this.handleError)
      // Ya no hay map para transformación de nombres aquí.
    );
  }

  /**
   * Actualiza un registro de interacción existente.
   * @param id El ID del registro a actualizar.
   * @param updatedRecord Un objeto que contiene la nueva pregunta (en la propiedad 'query').
   * NOTA: Aquí el 'query' del frontend se mapea a 'pregunta' del backend.
   * @returns Un Observable con el registro de interacción actualizado (QueryRecord).
   */
  updateQueryRecord(id: string, updatedRecord: { query: string }): Observable<QueryRecord> {
    // El backend espera la pregunta como un RequestParam para la edición.
    // El tipo de retorno del http.put es QueryRecord directamente.
    return this.http.put<QueryRecord>(`${this.baseUrl}/${id}?pregunta=${encodeURIComponent(updatedRecord.query)}`, {}, {
      headers: this.getHeaders('text/plain')
    }).pipe(
      timeout(this.timeoutDuration),
      catchError(this.handleError)
      // Ya no hay map para transformación de nombres aquí.
    );
  }

  /**
   * Desactiva lógicamente un registro de interacción (cambia su estado).
   * Corresponde al DELETE /{id} en el backend.
   * @param id El ID del registro a desactivar.
   * @returns Un Observable con el registro actualizado (QueryRecord).
   */
  deactivateQueryRecord(id: string): Observable<QueryRecord> {
    // El tipo de retorno del http.delete es QueryRecord directamente.
    return this.http.delete<QueryRecord>(`${this.baseUrl}/${id}`).pipe(
      timeout(this.timeoutDuration),
      catchError(this.handleError)
      // Ya no hay map para transformación de nombres aquí.
    );
  }

  /**
   * Restaura un registro de interacción que fue lógicamente desactivado.
   * Corresponde al PUT /restaurar/{id} en el backend.
   * @param id El ID del registro a restaurar.
   * @returns Un Observable con el registro restaurado (QueryRecord).
   */
  restoreQueryRecord(id: string): Observable<QueryRecord> {
    // El tipo de retorno del http.put es QueryRecord directamente.
    return this.http.put<QueryRecord>(`${this.baseUrl}/restaurar/${id}`, {}).pipe(
      timeout(this.timeoutDuration),
      catchError(this.handleError)
      // Ya no hay map para transformación de nombres aquí.
    );
  }
}
