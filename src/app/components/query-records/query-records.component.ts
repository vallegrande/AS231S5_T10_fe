import { Component, OnInit, AfterViewInit, ViewChild, TemplateRef } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { QueryRecordService } from '../../services/query-record.service';
import { QueryRecord } from '../../model/query'; // Importa la interfaz QueryRecord tal cual la definiste
import { MatSort } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-query-records',
  templateUrl: './query-records.component.html',
  styleUrls: ['./query-records.component.scss'],
})
export class QueryRecordsComponent implements OnInit, AfterViewInit {
  queryRecords: QueryRecord[] = []; // Usa QueryRecord directamente
  queryResult: string = ''; // Almacena la respuesta más reciente de la IA
  errorMessage: string = ''; // Mensajes de error para el usuario
  newQuery: string = ''; // Modelo para la nueva consulta ingresada por el usuario
  isLoading: boolean = false; // Indica si hay una operación en curso (carga, ejecución)
  statusFilter: 'A' | 'I' | 'all' = 'A'; // Filtro de estado para los registros ('A'ctivo, 'I'nactivo, 'all' Todos)
  editingRecord: QueryRecord | null = null; // Usa QueryRecord
  currentDialogRef: MatDialogRef<any> | null = null; // Referencia al diálogo de edición abierto

  // Columnas a mostrar en la tabla de historial
  // Se han renombrado para reflejar las propiedades de QueryRecord (pregunta, respuesta)
  displayedColumns: string[] = ['pregunta', 'respuesta', 'actions'];
  // Fuente de datos para la tabla, vinculada a MatTableDataSource
  dataSource: MatTableDataSource<QueryRecord>; // Usa QueryRecord directamente

  // Vistas hijo para el paginador, el ordenamiento y la plantilla del diálogo de edición
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('editDialogTemplate') editDialogTemplate!: TemplateRef<any>;

  constructor(
    private queryRecordService: QueryRecordService, // Servicio para interactuar con el backend
    private snackBar: MatSnackBar, // Servicio para mostrar mensajes emergentes (snack-bar)
    private dialog: MatDialog // Servicio para gestionar diálogos modales
  ) {
    this.dataSource = new MatTableDataSource<QueryRecord>([]); // Usa QueryRecord directamente
  }

  ngOnInit(): void {
    // Al inicializar el componente, cargar los registros iniciales
    this.loadRecords();
  }

  ngAfterViewInit() {
    // Después de que la vista ha sido inicializada, vincular el paginador y el ordenamiento a la fuente de datos
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    // Predicado personalizado para el filtrado de la tabla.
    // Busca coincidencias en los campos 'pregunta' y 'respuesta'.
    this.dataSource.filterPredicate = (data: QueryRecord, filter: string) => { // Usa QueryRecord
      const lowerCaseFilter = filter.trim().toLowerCase();
      return data.pregunta.toLowerCase().includes(lowerCaseFilter) ||
             data.respuesta.toLowerCase().includes(lowerCaseFilter);
    };
  }

  /**
   * Muestra un mensaje emergente (snack-bar) en la interfaz de usuario.
   * @param message El mensaje a mostrar.
   */
  private showSnackBar(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 3000, // Duración del mensaje en milisegundos
      horizontalPosition: 'center', // Posición horizontal del mensaje
      verticalPosition: 'bottom' // Posición vertical del mensaje
    });
  }

  /**
   * Extrae el contenido de la respuesta de la IA.
   * Asume que la respuesta del backend ya es texto plano.
   * @param response La cadena de respuesta recibida del backend.
   * @returns El contenido de texto de la respuesta.
   */
  private extractContent(response: string): string {
    // Basado en el backend AiInteraction, la respuesta ya es un String plano.
    return response;
  }

  /**
   * Carga los registros de interacciones desde el backend.
   * Aplica el filtro de estado actual ('A', 'I', 'all').
   */
  loadRecords(): void {
    this.isLoading = true; // Activa el indicador de carga
    this.errorMessage = ''; // Limpia cualquier mensaje de error anterior

    // Llama al servicio para obtener todos los registros.
    // El servicio ahora devuelve QueryRecord[], tal cual vienen del backend.
    this.queryRecordService.getAllQueryRecords().subscribe({
      next: (records: QueryRecord[]) => { // Usa QueryRecord[]
        let filteredRecords = records;
        // Aplica el filtro de estado si no es 'all'
        if (this.statusFilter !== 'all') {
          filteredRecords = records.filter(record => record.status === this.statusFilter);
        }
        this.queryRecords = filteredRecords;
        this.dataSource.data = this.queryRecords; // Actualiza la fuente de datos de la tabla
      },
      error: (error: Error) => {
        this.errorMessage = 'Error al obtener los registros: ' + error.message;
        this.showSnackBar('Error al cargar los registros');
        console.error('Error completo:', error);
      },
      complete: () => {
        this.isLoading = false; // Desactiva el indicador de carga
      }
    });
  }

  /**
   * Ejecuta una consulta a la IA y la guarda en la base de datos.
   * Limpia el campo de nueva consulta y actualiza el historial.
   */
  executeAndSaveQuery(): void {
    if (!this.newQuery.trim()) {
      this.showSnackBar('Por favor ingrese una consulta');
      return;
    }

    this.isLoading = true; // Activa el indicador de carga
    this.errorMessage = ''; // Limpia cualquier mensaje de error anterior
    this.queryResult = ''; // Limpia el resultado anterior

    // Llama al servicio para crear una nueva interacción
    // El servicio ahora devuelve QueryRecord, tal cual viene del backend.
    this.queryRecordService.createInteraction(this.newQuery).subscribe({
      next: (responseRecord: QueryRecord) => { // Usa QueryRecord
        this.queryResult = this.extractContent(responseRecord.respuesta); // Accede a 'respuesta'
        this.newQuery = ''; // Limpia el campo de consulta
        this.showSnackBar('Consulta guardada exitosamente');
        this.loadRecords(); // Recarga los registros para mostrar el nuevo
      },
      error: (error: Error) => {
        this.errorMessage = 'Error al ejecutar y almacenar la consulta: ' + error.message;
        this.showSnackBar('Error al guardar la consulta');
        console.error('Error completo:', error);
      },
      complete: () => {
        this.isLoading = false; // Desactiva el indicador de carga
      }
    });
  }

  /**
   * Abre el diálogo de edición para un registro de consulta.
   * @param record El registro de consulta a editar (QueryRecord).
   */
  openEditDialog(record: QueryRecord): void { // Usa QueryRecord
    this.currentDialogRef = this.dialog.open(this.editDialogTemplate, {
      width: '500px', // Ancho del diálogo
      data: {
        originalRecord: record, // Se pasa el registro original
        originalQuery: record.pregunta, // La consulta original para mostrar (usa 'pregunta')
        editedQuery: record.pregunta // La consulta editable, inicializada con la original (usa 'pregunta')
      }
    });

    // Suscribe al evento de cierre del diálogo para manejar la respuesta
    this.currentDialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.saveEdit(result); // Si el diálogo devuelve un resultado (se guarda), llamar a saveEdit
      }
    });
  }

  /**
   * Confirma la edición en el diálogo y lo cierra.
   * @param editData Los datos editados del diálogo.
   */
  confirmEdit(editData: any): void {
    if (this.currentDialogRef) {
      this.currentDialogRef.close(editData); // Cierra el diálogo con los datos editados
    }
  }

  /**
   * Guarda los cambios de una consulta editada llamando al servicio.
   * @param editData Los datos que contienen el registro original y la consulta editada.
   */
  saveEdit(editData: any): void {
    // Aquí, el 'query' del editData se mapea a 'pregunta' del backend
    this.queryRecordService.updateQueryRecord(editData.originalRecord.id, {
      query: editData.editedQuery // El servicio espera una propiedad 'query'
    }).subscribe({
      next: () => {
        this.showSnackBar('Consulta actualizada exitosamente');
        this.loadRecords(); // Recarga los registros para reflejar los cambios
      },
      error: (error: Error) => {
        this.showSnackBar('Error al actualizar la consulta');
        console.error('Error al actualizar:', error);
      }
    });
  }

  /**
   * Cancela la edición y cierra el diálogo.
   */
  cancelEdit(): void {
    if (this.currentDialogRef) {
      this.currentDialogRef.close(); // Simplemente cierra el diálogo sin guardar
    }
  }

  /**
   * Cambia el estado (activa/inactiva) de un registro de consulta.
   * Utiliza el servicio para desactivar o restaurar el registro.
   * @param record El registro de consulta cuyo estado se va a cambiar (QueryRecord).
   */
  toggleStatus(record: QueryRecord): void { // Usa QueryRecord
    if (record.status === 'A') {
      // Si el registro está activo, desactivarlo (eliminación lógica)
      this.queryRecordService.deactivateQueryRecord(record.id).subscribe({
        next: () => {
          this.showSnackBar('Registro desactivado exitosamente');
          this.loadRecords(); // Recargar registros
        },
        error: (error: Error) => {
          this.showSnackBar('Error al desactivar el registro');
          console.error('Error al desactivar:', error);
        }
      });
    } else {
      // Si el registro está inactivo, restaurarlo
      this.queryRecordService.restoreQueryRecord(record.id).subscribe({
        next: () => {
          this.showSnackBar('Registro restaurado exitosamente');
          this.loadRecords(); // Recargar registros
        },
        error: (error: Error) => {
          this.showSnackBar('Error al restaurar el registro');
          console.error('Error al restaurar:', error);
        }
      });
    }
  }

  /**
   * Actualiza el filtro de estado y recarga los registros.
   */
  updateStatusFilter(): void {
    this.loadRecords();
  }

  /**
   * Aplica un filtro de texto a la tabla de historial.
   * @param event El evento de teclado.
   */
  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    // Si hay un paginador, volver a la primera página después de aplicar el filtro
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
}