# 📚 Biblioteca Digital Personal

API REST completa para gestión de biblioteca digital personal con autenticación JWT, control de usuarios y seguimiento de lectura.

## 🚀 Características

- **Autenticación JWT** con registro y login seguro
- **Sistema de roles** (Admin / Usuario) con aprobación de registros
- **Subida de PDFs** con extracción automática de portadas (PyMuPDF)
- **Control de progreso de lectura** por usuario
- **Búsqueda avanzada** por título, autor, género y año
- **Sistema de auditoría** completo (acciones de usuarios)
- **API REST documentada** con FastAPI
- **Despliegue con Cloudflare** para acceso desde internet

## 🛠️ Tecnologías

| Tecnología | Uso |
|---|---|
| **FastAPI** | Framework web y API REST |
| **SQLite** | Base de datos |
| **PyJWT** | Autenticación JWT |
| **bcrypt** | Hashing de contraseñas |
| **PyMuPDF** | Extracción de portadas de PDF |
| **Cloudflare** | Despliegue y túneles |

## 📁 Estructura del Proyecto

```
biblioteca_digital/
├── main.py           # API principal (endpoints)
├── database.py       # Configuración y esquema de BD
├── models.py         # Modelos Pydantic
├── security.py       # JWT, hashing, autenticación
├── requirements.txt  # Dependencias
├── deploy.sh         # Script de despliegue
├── static/           # Frontend (HTML/CSS/JS)
│   ├── index.html    # Panel principal
│   ├── reader.html   # Lector de PDFs
│   ├── css/
│   └── js/
└── storage/          # Almacenamiento de PDFs y portadas
```

## 🏗️ Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/usuario/biblioteca-digital.git
cd biblioteca-digital
```

### 2. Crear entorno virtual

```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Instalar dependencias

```bash
pip install -r requirements.txt
```

### 4. Ejecutar el servidor

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Acceder

- **API:** http://localhost:8000
- **Panel:** http://localhost:8000/static/index.html
- **Documentación:** http://localhost:8000/docs

## 📡 API Endpoints

### Autenticación
| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/api/register` | Registrar nuevo usuario |
| `POST` | `/api/token` | Login y obtener token JWT |
| `GET` | `/api/me` | Información del usuario actual |

### Catálogo de Libros
| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/books` | Listar libros (con filtros) |
| `GET` | `/api/books/{id}` | Detalle de un libro |
| `GET` | `/api/books/{id}/file` | Descargar PDF |
| `GET` | `/api/books/genres` | Listar géneros disponibles |
| `GET` | `/api/books/years` | Listar años disponibles |

### Progreso de Lectura
| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/api/progress/{book_id}` | Actualizar página actual |

### Administración (solo admin)
| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/admin/users` | Listar usuarios |
| `POST` | `/api/admin/users/{id}/approve` | Aprobar usuario |
| `POST` | `/api/admin/users/{id}/reject` | Rechazar usuario |
| `POST` | `/api/books/upload` | Subir nuevo libro |
| `GET` | `/api/admin/audit` | Ver log de auditoría |

## 🔐 Sistema de Seguridad

- **Contraseñas:** Hasheadas con bcrypt (nunca se almacenan en texto plano)
- **Tokens JWT:** Expiración configurable (30 días por defecto)
- **Roles:** Admin y Usuario con permisos diferenciados
- **Aprobación:** Los nuevos usuarios requieren aprobación del admin
- **Auditoría:** Todas las acciones quedan registradas con IP

## 🚀 Despliegue con Cloudflare

```bash
# Ejecutar script de despliegue
chmod +x deploy.sh
./deploy.sh

# Para acceso desde internet
cloudflared tunnel create biblioteca
cloudflared tunnel run biblioteca
```

## 📸 Screenshots

> *Próximamente: screenshots del panel de administración y lector de PDFs*

## 🎯 Funcionalidades Futuras

- [ ] Búsqueda full-text en contenido de PDFs
- [ ] Etiquetas y categorías personalizadas
- [ ] Estadísticas de lectura
- [ ] Exportar lista de libros
- [ ] Soporte para ePub y otros formatos

## 👨‍💻 Autor

**José Daniel Basto Méndez**
- GitHub: [@josedaniel-dev](https://github.com/josedaniel-dev)
- Email: mcl.danielxp@gmail.com

## 📄 Licencia

MIT License
