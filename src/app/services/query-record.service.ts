import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class QueryRecordService {
  private baseUrl = environment.URL_IA;
  private timeoutDuration = 30000; // 30 seconds timeout

  constructor(private http: HttpClient) {}

  private getHeaders(contentType: 'text/plain' | 'application/json' = 'text/plain'): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': contentType,
      'Accept': 'application/json'
    });
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred in the request';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Client error: ${error.error.message}`;
    } else if (error.status === 0) {
      errorMessage = 'Could not connect to the server. Please check your connection.';
    } else if (error.status === 404) {
      errorMessage = 'The requested resource was not found.';
    } else if (error.status === 500) {
      errorMessage = 'Internal server error.';
    } else {
      errorMessage = `Server error: ${error.status}, message: ${error.message}`;
    }

    console.error('Detailed error:', error);
    return throwError(() => new Error(errorMessage));
  }

  // Executes a Groq query without storing
  executeQuery(query: string): Observable<string> {
    return this.http.post<string>(`${this.baseUrl}/groq/query`, query, {
      headers: this.getHeaders('text/plain'),
      responseType: 'text' as 'json'
    }).pipe(
      timeout(this.timeoutDuration),
      catchError(this.handleError)
    );
  }

  // Executes a Groq query and stores the record
  executeQueryAndStore(query: string): Observable<{id: string, response: string}> {
    return this.http.post<{id: string, response: string}>(`${this.baseUrl}/groq/query-and-store`, query, {
      headers: this.getHeaders('text/plain')
    }).pipe(
      timeout(this.timeoutDuration),
      catchError(this.handleError)
    );
  }

  // Retrieves all active query records
  getAllQueryRecords(): Observable<{id: string, response: string, status: string}[]> {
    return this.http.get<{id: string, response: string, status: string}[]>(`${this.baseUrl}/query-records`).pipe(
      timeout(this.timeoutDuration),
      catchError(this.handleError)
    );
  }

  // Retrieves a specific query record by ID
  getQueryRecordById(id: string): Observable<{id: string, response: string}> {
    return this.http.get<{id: string, response: string}>(`${this.baseUrl}/query-records/${id}`).pipe(
      timeout(this.timeoutDuration),
      catchError(this.handleError)
    );
  }

  // Updates an existing query record
  updateQueryRecord(id: string, updatedRecord: {query: string}): Observable<{id: string, response: string}> {
    return this.http.put<{id: string, response: string}>(`${this.baseUrl}/query-records/${id}`, updatedRecord).pipe(
      timeout(this.timeoutDuration),
      catchError(this.handleError)
    );
  }

  // Soft deletes (changes status) a query record
  deleteQueryRecord(id: string): Observable<{id: string, status: string}> {
    return this.http.delete<{id: string, status: string}>(`${this.baseUrl}/query-records/${id}`).pipe(
      timeout(this.timeoutDuration),
      catchError(this.handleError)
    );
  }
}
