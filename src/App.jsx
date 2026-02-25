import React, { useState, useEffect } from 'react';
import { Menu, Plus, ArrowLeft, Trash2, Shield, User, Database, FileText, Upload, Image as ImageIcon, AlertCircle, FileUp, Link, X, Check, Lock, Key, Edit, Eye, Phone, Mail } from 'lucide-react';
// IMPORTANTE: Cambia estas 2 líneas en tu VS Code quitando el "https://esm.sh/"
import { createClient } from '@supabase/supabase-js';
import { Analytics } from '@vercel/analytics/react';

// --- CONFIGURACIÓN DE TU DOMINIO OFICIAL ---
const DOMINIO_PRODUCCION = "https://avalusid-database-private.vercel.app"; 

// --- CONEXIÓN A SUPABASE ---
const getEnvVar = (key) => {
  try { return import.meta.env[key]; } catch (e) { return null; }
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// --- CREDENCIALES DE ADMINISTRADOR ---
const ADMIN_USERNAME = "ADMINISTRADOR_Fab";
const ADMIN_PASSWORD = "Fabian090912";

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);

  const [credentials, setCredentials] = useState([]);
  const [currentView, setCurrentView] = useState('list'); 
  const [selectedCred, setSelectedCred] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(''); 
  const [isSaving, setIsSaving] = useState(false);
  
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  
  const [isPublicView, setIsPublicView] = useState(false);
  const [isFetchingCred, setIsFetchingCred] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  
  const [docToView, setDocToView] = useState(null);

  // NUEVOS DATOS AÑADIDOS AL ESTADO
  const [formData, setFormData] = useState({
    id: null,
    id_visual: '', // ID de 10 dígitos aleatorio
    nombre: '', apellidos: '', curp: '', fecha_nacimiento: '', empresa: '', puesto: '',
    noSerie: '', tipo: '', modelo: '', color: '#1a1a1a', 
    fotoPerfil: '', fotoModelo: '', documentos: [] 
  });

  useEffect(() => {
    if (!supabase) {
      setErrorMsg("Falta configurar Supabase. Verifica tu archivo .env");
      return;
    }

    const path = window.location.pathname;
    let idEscaneado = null;
    
    if (path.startsWith('/credencialib/')) {
      idEscaneado = path.split('/credencialib/')[1];
    } else {
      const params = new URLSearchParams(window.location.search);
      idEscaneado = params.get('id');
    }

    if (idEscaneado) {
      setIsPublicView(true);
      setIsFetchingCred(true);
      cargarCredencialPorId(idEscaneado).finally(() => setIsFetchingCred(false));
    } else {
      setIsPublicView(false);
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (usernameInput === ADMIN_USERNAME && passwordInput === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setLoginError(false);
      setUsernameInput(''); 
      setPasswordInput('');
      cargarTodasLasCredenciales();
    } else {
      setLoginError(true);
      setPasswordInput(''); 
    }
  };

  const cargarTodasLasCredenciales = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('credenciales')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCredentials(data || []);
    } catch (error) {
      console.error("Error cargando DB:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const cargarCredencialPorId = async (id) => {
    try {
      const { data, error } = await supabase
        .from('credenciales')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setSelectedCred(data);
        setCurrentView('detail');
      }
    } catch (error) {
      console.error("Credencial no encontrada.");
    }
  };

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400; 
          const scaleSize = Math.min(1, MAX_WIDTH / img.width);
          canvas.width = img.width * scaleSize;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.6)); 
        };
      };
      reader.onerror = error => reject(error);
    });
  };

  const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const handleImageChange = async (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const base64Data = await compressImage(file);
      setFormData(prev => ({ ...prev, [fieldName]: base64Data }));
    } catch (error) {
      setErrorMsg("Error al procesar la imagen.");
    }
  };

  const handleDynamicFileChange = async (e, id) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg(`El archivo es muy pesado (máximo 2MB).`);
      return;
    }
    try {
      const base64Data = await readFileAsBase64(file);
      const extension = file.name.split('.').pop(); 
      setFormData(prev => ({
        ...prev,
        documentos: prev.documentos.map(doc => 
          doc.id === id ? { ...doc, base64: base64Data, extension } : doc
        )
      }));
    } catch (error) {
      setErrorMsg("Error al leer el archivo.");
    }
  };

  const addDocumentRow = () => {
    if (formData.documentos.length >= 10) return;
    setFormData(prev => ({
      ...prev,
      documentos: [...prev.documentos, { id: Date.now().toString(), nombre: '', base64: '', extension: '' }]
    }));
  };

  const updateDocumentName = (id, newName) => {
    setFormData(prev => ({
      ...prev,
      documentos: prev.documentos.map(doc => doc.id === id ? { ...doc, nombre: newName } : doc)
    }));
  };

  const removeDocumentRow = (id) => {
    setFormData(prev => ({
      ...prev,
      documentos: prev.documentos.filter(doc => doc.id !== id)
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNewRecord = () => {
    setFormData({
      id: null, id_visual: '',
      nombre: '', apellidos: '', curp: '', fecha_nacimiento: '', empresa: '', puesto: '',
      noSerie: '', tipo: '', modelo: '', color: '#1a1a1a', 
      fotoPerfil: '', fotoModelo: '', documentos: [] 
    });
    setCurrentView('form');
    window.scrollTo(0,0);
  };

  const handleEditRecord = (cred) => {
    setFormData({ ...cred });
    setCurrentView('form');
    window.scrollTo(0,0);
  };

  // Función para generar un número aleatorio de 10 dígitos como string
  const generateIdVisual = () => {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
  };

  // Función auxiliar para convertir "YYYY-MM-DD" a "DD/MM/YYYY"
  const formatDateToDMY = (dateString) => {
    if (!dateString) return '-';
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!supabase) return;

    if (formData.documentos.some(doc => !doc.nombre.trim())) {
      setErrorMsg("Por favor, ponle un nombre a todos los documentos adjuntos.");
      return;
    }

    setIsSaving(true);
    try {
      const dataToSave = { ...formData };

      // CORRECCIÓN: Si el registro (nuevo O viejo) NO tiene id_visual, se lo generamos aquí.
      if (!dataToSave.id_visual) {
        dataToSave.id_visual = generateIdVisual();
      }

      if (dataToSave.id) {
        const { error } = await supabase.from('credenciales').update(dataToSave).eq('id', dataToSave.id);
        if (error) throw error;
      } else {
        const { id, ...dataToInsert } = dataToSave; 
        const { error } = await supabase.from('credenciales').insert([dataToInsert]);
        if (error) throw error;
      }
      
      setFormData({
        id: null, id_visual: '', nombre: '', apellidos: '', curp: '', fecha_nacimiento: '', empresa: '', puesto: '',
        noSerie: '', tipo: '', modelo: '', color: '#1a1a1a',
        fotoPerfil: '', fotoModelo: '', documentos: []
      });
      setCurrentView('list');
      cargarTodasLasCredenciales();
    } catch (error) {
      console.error(error);
      setErrorMsg("Error al guardar en Supabase.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('credenciales').delete().eq('id', id);
      if (error) throw error;
      cargarTodasLasCredenciales();
    } catch (error) {
      setErrorMsg("No se pudo eliminar el registro.");
    }
  };

  // --- MODALES ---
  const ErrorModal = () => {
    if (!errorMsg) return null;
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">Aviso</h3>
          <p className="text-gray-600 mb-6 text-sm">{errorMsg}</p>
          <button onClick={() => setErrorMsg('')} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg">
            Entendido
          </button>
        </div>
      </div>
    );
  };

  const ModalShare = () => {
    if (!showShareModal || !selectedCred) return null;
    
    const baseUrl = DOMINIO_PRODUCCION || window.location.origin;
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const url = `${cleanBaseUrl}/credencialib/${selectedCred.id}`;

    const copiarEnlace = () => {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    };

    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-[#2d2d2d] rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center relative border border-gray-700">
          <button onClick={() => setShowShareModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition"><X size={24} /></button>
          
          <h3 className="text-xl font-bold text-white mb-4 mt-2">Enlace Público Oficial</h3>
          
          <div className="bg-white/10 p-4 rounded-xl mb-6 break-all border border-white/10 shadow-inner">
            <p className="text-blue-400 text-sm font-medium">{url}</p>
          </div>
          
          <p className="text-gray-400 text-sm mb-6">Este es el enlace de la IVCD publica</p>
          
          <button onClick={copiarEnlace} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition shadow-lg flex items-center justify-center gap-2">
            {copiedLink ? <><Check size={20}/> ¡Copiado!</> : <><Link size={20}/> Copiar Enlace</>}
          </button>
        </div>
      </div>
    );
  };

  const SuggestionModal = () => {
    const [sugerencia, setSugerencia] = useState('');
    const [correo, setCorreo] = useState('');

    if (!showSuggestionModal || !selectedCred) return null;

    const handleEnviarSugerencia = () => {
      const subject = encodeURIComponent(`Sugerencia de Cambio - Credencial: ${selectedCred.nombre} ${selectedCred.apellidos}`);
      const body = encodeURIComponent(`Correo de contacto proporcionado: ${correo}\n\nSugerencia o cambios solicitados:\n${sugerencia}`);
      window.location.href = `mailto:fabiansandtejpublic12@outlook.com?subject=${subject}&body=${body}`;
      
      setShowSuggestionModal(false);
      setSugerencia('');
      setCorreo('');
    };

    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-[#2d2d2d] rounded-2xl shadow-2xl max-w-sm w-full p-6 text-left relative border border-gray-700">
          <button onClick={() => setShowSuggestionModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition"><X size={24} /></button>
          
          <h3 className="text-xl font-bold text-white mb-2 pr-6 flex items-center gap-2">
            <Edit size={20} className="text-blue-500" /> Sugerir Cambios
          </h3>
          
          <p className="text-gray-400 text-[11px] mb-5 leading-relaxed bg-white/5 p-3 rounded-lg border border-white/5">
            Lo verificaremos y haremos los cambios en un máximo de <strong>3 días hábiles</strong> o en caso de que surja algo más como querer agregar un nuevo documento se le contactará igual en 3 días máximo, tomando en cuenta que estos cambios son solo referentes a documentos o información de tu IVCD mas no del diseño de esta.
          </p>
          
          <label className="block text-gray-300 text-xs font-bold mb-1">Correo para contactarte:</label>
          <input 
            type="email" 
            placeholder="ejemplo@correo.com" 
            value={correo} 
            onChange={(e) => setCorreo(e.target.value)} 
            className="w-full mb-4 p-3 bg-[#1a1a1a] border border-gray-600 rounded-xl text-white text-sm outline-none focus:border-blue-500 transition" 
          />
          
          <label className="block text-gray-300 text-xs font-bold mb-1">¿Qué cambios requieres?</label>
          <textarea 
            placeholder="Describe los cambios o documentos a agregar..." 
            value={sugerencia} 
            onChange={(e) => setSugerencia(e.target.value)} 
            rows="4" 
            className="w-full mb-5 p-3 bg-[#1a1a1a] border border-gray-600 rounded-xl text-white text-sm outline-none resize-none focus:border-blue-500 transition"
          ></textarea>
          
          <button 
            onClick={handleEnviarSugerencia} 
            disabled={!sugerencia || !correo} 
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:text-gray-400 text-white font-bold py-3 rounded-xl transition shadow-lg flex items-center justify-center gap-2"
          >
            Enviar Solicitud
          </button>
        </div>
      </div>
    );
  };

  const DocumentViewerModal = () => {
    const [blobUrl, setBlobUrl] = useState(null);

    useEffect(() => {
      if (!docToView) {
        setBlobUrl(null);
        return;
      }

      const isImage = docToView.base64.startsWith('data:image');

      if (!isImage) {
        try {
          const arr = docToView.base64.split(',');
          const mime = arr[0].match(/:(.*?);/)[1];
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          const blob = new Blob([u8arr], { type: mime });
          const url = URL.createObjectURL(blob);
          setBlobUrl(url);

          return () => URL.revokeObjectURL(url);
        } catch (error) {
          console.error("Error al optimizar PDF para celular:", error);
          setBlobUrl(docToView.base64); 
        }
      } else {
        setBlobUrl(docToView.base64);
      }
    }, [docToView]);

    if (!docToView) return null;
    const isImage = docToView.base64.startsWith('data:image');

    return (
      <div className="fixed inset-0 bg-black/95 z-[60] flex flex-col items-center justify-center p-4 backdrop-blur-sm">
        <div className="w-full max-w-4xl flex justify-between items-center mb-4 gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-lg truncate">{docToView.nombre}</h3>
            {!isImage && <p className="text-gray-400 text-[10px] sm:text-xs">Si la pantalla está blanca, pulsa el botón azul 👉</p>}
          </div>
          
          {!isImage && (
            <a href={blobUrl || docToView.base64} target="_blank" rel="noopener noreferrer" className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition shadow-md whitespace-nowrap flex items-center gap-2">
              <FileText size={16} /> Abrir PDF
            </a>
          )}
          
          <button onClick={() => setDocToView(null)} className="text-white hover:text-red-400 bg-white/10 hover:bg-white/20 p-2 rounded-xl transition flex-shrink-0">
            <X size={24} />
          </button>
        </div>
        
        <div className="w-full flex-grow max-h-[85vh] bg-white/5 rounded-2xl overflow-hidden flex items-center justify-center border border-white/10 relative">
          {isImage ? (
            <img src={docToView.base64} alt={docToView.nombre} className="max-w-full max-h-full object-contain" />
          ) : (
            <iframe src={blobUrl ? `${blobUrl}#toolbar=0` : ''} className="w-full h-full border-0 bg-white" title={docToView.nombre}></iframe>
          )}
        </div>
      </div>
    );
  };

  // ==========================================
  // VISTAS PRINCIPALES DE LA APLICACIÓN
  // ==========================================

  // --- VISTA 1: CREDENCIAL INVÁLIDA O CARGANDO PÚBLICA ---
  if (isPublicView) {
    if (isFetchingCred) {
      return (
        <div className="min-h-screen bg-[#222222] flex flex-col items-center justify-center p-6 font-sans text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
          <p className="text-white font-medium">Cargando credencial...</p>
        </div>
      );
    }
    
    if (!selectedCred) {
      return (
        <div className="min-h-screen bg-[#222222] flex flex-col items-center justify-center p-6 font-sans text-center">
          <Analytics />
          <AlertCircle className="text-red-500 mb-6" size={64} />
          <h2 className="text-white text-2xl font-bold mb-2">IVCD no encontrada</h2>
          <p className="text-gray-400 text-sm max-w-sm mb-8 leading-relaxed">
            El enlace que intentas abrir es inválido o la IVCD ha sido dada de baja del sistema.
          </p>
          <p className="text-white/20 text-[10px] uppercase tracking-widest font-bold">Seguridad AvalusID</p>
        </div>
      );
    }
  }

  // --- VISTA 2: LOGIN DE ADMINISTRADOR ---
  if (!isPublicView && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
        <Analytics />
        <div className="bg-white max-w-md w-full rounded-2xl shadow-xl overflow-hidden border border-gray-200">
          <div className="bg-[#222222] p-8 text-center border-b-4 border-blue-600">
            <div className="w-16 h-16 bg-[#333] rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
              <Shield size={32} className="text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">Acceso Restringido</h2>
            <p className="text-gray-400 text-sm">Panel de Administración de Credenciales</p>
          </div>
          
          <form onSubmit={handleLogin} className="p-8">
            <div className="mb-5">
              <label className="block text-sm font-bold text-gray-700 mb-2">Usuario</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User size={18} className="text-gray-400" /></div>
                <input type="text" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition bg-gray-50" placeholder="Ingresa tu usuario" autoFocus />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Key size={18} className="text-gray-400" /></div>
                <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition bg-gray-50" placeholder="Ingresa tu contraseña" />
              </div>
              {loginError && <p className="text-red-500 text-sm mt-3 font-medium text-center bg-red-50 p-2 rounded-lg border border-red-100">Usuario o contraseña incorrectos.</p>}
            </div>
            
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2">
              <Lock size={18} /> Ingresar al Sistema
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- VISTA 3: CREDENCIAL (Pública o Interna) ---
  if (currentView === 'detail' && selectedCred) {
    const c = selectedCred;
    const hasEquipo = c.noSerie || c.tipo || c.modelo || c.fotoModelo;

    return (
      <div className="min-h-screen bg-[#222222] flex flex-col items-center relative font-sans">
        <Analytics />
        <ModalShare />
        <SuggestionModal />
        <DocumentViewerModal />
        
        {/* Barra superior de navegación, solo para admin si NO está fingiendo ser público */}
        {!isPublicView && (
          <div className="w-full bg-[#374151] p-3 flex justify-between items-center shadow-md">
            <button onClick={() => setCurrentView('list')} className="text-white hover:bg-white/10 p-1.5 rounded-md transition"><ArrowLeft size={24} /></button>
            <button className="text-white hover:bg-white/10 border border-white/20 p-1.5 rounded-md transition"><Menu size={24} /></button>
          </div>
        )}

        <div className={`w-full max-w-md bg-[#2d2d2d] flex-grow flex flex-col pb-6 ${isPublicView ? 'pt-6' : ''}`}>
          <div className="py-4 border-b border-gray-600 mb-6 mx-4"><h1 className="text-white text-center text-xl font-medium tracking-wide">IVCD del Colaborador</h1></div>
          <div className="flex justify-center mb-6">
            {c.fotoPerfil ? <img src={c.fotoPerfil} alt="Perfil" className="w-32 h-32 rounded-[2rem] object-cover shadow-lg bg-white" /> : <div className="w-32 h-32 rounded-[2rem] bg-gray-600 flex items-center justify-center text-white"><User size={40}/></div>}
          </div>
          
          <div className="space-y-3 mb-4">
            <div className="grid grid-cols-[1fr_1fr] gap-4 w-full px-4"><div className="text-right font-bold text-white text-sm">Nombre</div><div className="text-left text-white text-sm">{c.nombre || '-'}</div></div>
            <div className="grid grid-cols-[1fr_1fr] gap-4 w-full px-4"><div className="text-right font-bold text-white text-sm">Apellidos</div><div className="text-left text-white text-sm">{c.apellidos || '-'}</div></div>
            <div className="grid grid-cols-[1fr_1fr] gap-4 w-full px-4"><div className="text-right font-bold text-white text-sm">CURP</div><div className="text-left text-white text-sm uppercase">{c.curp || '-'}</div></div>
            <div className="grid grid-cols-[1fr_1fr] gap-4 w-full px-4"><div className="text-right font-bold text-white text-sm">F. Nacimiento</div><div className="text-left text-white text-sm">{formatDateToDMY(c.fecha_nacimiento)}</div></div>
            <div className="grid grid-cols-[1fr_1fr] gap-4 w-full px-4"><div className="text-right font-bold text-white text-sm">Empresa</div><div className="text-left text-white text-sm">{c.empresa || '-'}</div></div>
            <div className="grid grid-cols-[1fr_1fr] gap-4 w-full px-4"><div className="text-right font-bold text-white text-sm">Puesto</div><div className="text-left text-white text-sm">{c.puesto || '-'}</div></div>
            
            {/* AQUÍ SE MUESTRA EL ID VISUAL GENERADO AUTOMÁTICAMENTE */}
            <div className="grid grid-cols-[1fr_1fr] gap-4 w-full px-4"><div className="text-right font-bold text-white text-sm opacity-60">iD</div><div className="text-left text-white text-sm font-mono opacity-60">{c.id_visual || 'No asignado'}</div></div>
          </div>
          
          <div className="my-2 border-b border-gray-700/50 mx-4"></div>
          <div className="mt-4 mb-2 px-4"><h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest text-center mb-4">Archivos del Personal</h3></div>
          
          {c.documentos && c.documentos.length > 0 ? (
            c.documentos.map((doc) => (
              <div key={doc.id} className="grid grid-cols-[1fr_auto] gap-4 items-center w-full mb-3 px-6">
                <div className="text-left font-bold text-white text-sm leading-tight break-words">{doc.nombre}</div>
                <div className="flex justify-end">
                  {doc.base64 ? (
                    <button onClick={() => setDocToView(doc)} className="bg-[#5b9bd5] hover:bg-[#4a89dc] text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-sm">
                      Ver Documento <Eye size={16} />
                    </button>
                  ) : (
                    <span className="text-gray-500 text-sm italic px-2 py-1.5">No subido</span>
                  )}
                </div>
              </div>
            ))
          ) : <div className="text-center text-gray-500 text-sm italic mb-4">No hay documentos adjuntos</div>}

          {hasEquipo && (
            <>
              <div className="my-4 border-b border-gray-700/50 mx-4"></div>
              <div className="mt-4 mb-4 px-4"><h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest text-center">Información de Equipo</h3></div>
              <div className="space-y-3 mb-4">
                {c.noSerie && <div className="grid grid-cols-[1fr_1fr] gap-4 w-full px-4"><div className="text-right font-bold text-white text-sm">No Serie</div><div className="text-left text-white text-sm">{c.noSerie}</div></div>}
                {c.tipo && <div className="grid grid-cols-[1fr_1fr] gap-4 w-full px-4"><div className="text-right font-bold text-white text-sm">Tipo</div><div className="text-left text-white text-sm pr-4">{c.tipo}</div></div>}
                {c.modelo && <div className="grid grid-cols-[1fr_1fr] gap-4 w-full px-4"><div className="text-right font-bold text-white text-sm">Modelo</div><div className="text-left text-white text-sm">{c.modelo}</div></div>}
              </div>
              <div className="grid grid-cols-[1fr_1fr] gap-4 items-center w-full mb-3 mt-2 px-4">
                <div className="text-right font-bold text-white text-sm mt-4">Foto Modelo</div>
                <div className="flex justify-start">
                  <div className="bg-white rounded-xl p-2 w-32 h-32 flex items-center justify-center shadow-inner mt-4 overflow-hidden">
                    {c.fotoModelo ? <img src={c.fotoModelo} alt="Modelo" className="max-w-full max-h-full object-contain" /> : <span className="text-gray-400 text-xs">Sin imagen</span>}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-[1fr_1fr] gap-4 items-center w-full mb-8 px-4 mt-6">
                <div className="text-right font-bold text-white text-sm">Color Identificador</div>
                <div className="flex justify-start">
                  <div className="w-32 h-10 rounded-lg shadow-inner border border-gray-600" style={{ backgroundColor: c.color || '#1a1a1a' }}></div>
                </div>
              </div>
            </>
          )}

          {/* VISTA PRIVADA DEL ADMIN: Solo muestra el botón de Obtener Enlace */}
          {!isPublicView && (
            <div className="mt-8 px-8 mb-4">
              <button onClick={() => setShowShareModal(true)} className="w-full bg-white text-[#222222] font-bold py-3 px-4 rounded-xl shadow-lg flex items-center justify-center gap-2 hover:bg-gray-200 transition">
                <Link size={20} /> Obtener Enlace
              </button>
            </div>
          )}

          {/* VISTA PÚBLICA (LO QUE SE VE POR FUERA): Sugerencias, Feedback y AVISO DE PRIVACIDAD */}
          {isPublicView && (
            <div className="mt-6 px-6 space-y-3 flex flex-col flex-grow">
              <div className="my-6 border-b border-gray-700/50 mx-2"></div>
              
              {/* Botón de Sugerencias */}
              <button 
                onClick={() => setShowSuggestionModal(true)} 
                className="w-full bg-[#374151] hover:bg-[#4b5563] text-white font-medium py-3 px-4 rounded-xl border border-gray-600 flex items-center justify-center gap-2 transition text-sm shadow-md"
              >
                <Edit size={18} /> Solicitar cambios de datos en IVCD
              </button>
              
              {/* Botón de Feedback (Bugs) */}
              <a 
                href="mailto:creddbcdfst21@outlook.com?subject=Reporte%20de%20Bug%20o%20Problema%20-%20Sistema%20de%20Credenciales" 
                className="w-full text-gray-500 hover:text-gray-300 font-medium py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition text-xs"
              >
                <AlertCircle size={14} /> Reportar un problema o error de la página
              </a>

              {/* Espaciador para empujar el aviso de privacidad hasta abajo si hay espacio */}
              <div className="flex-grow"></div>

              {/* AVISO DE PRIVACIDAD Y DERECHOS ARCO */}
              <div className="mt-8 mb-2">
                <div className="bg-[#1f1f1f] p-4 rounded-xl border border-gray-700/50 text-center shadow-inner">
                  <Shield className="w-4 h-4 text-gray-500 mx-auto mb-2 opacity-70" />
                  <h4 className="text-gray-300 text-[10px] font-bold uppercase tracking-wider mb-2">Aviso de Privacidad y Derechos ARCO</h4>
                  <p className="text-gray-500 text-[10px] leading-relaxed mb-4 text-justify">
                    Los datos personales mostrados en este Identificador Visual Corporativo Digital "IVCD" se encuentran protegidos. El titular de los mismos tiene pleno derecho a <strong>Acceder, Rectificar, Cancelar u Oponerse</strong> (ARCO) al tratamiento de su información en cualquier momento.
                  </p>
                  
                  <div className="border-t border-gray-700/50 pt-3">
                    <p className="text-gray-400 text-[10px] font-medium mb-2">Para solicitudes legales o aclaraciones contacte a la empresa:</p>
                    <div className="flex flex-col gap-2 items-center">
                      <a href="tel:+522204716091" className="text-blue-400 text-[11px] hover:text-blue-300 transition flex items-center gap-1.5 bg-blue-400/10 px-3 py-1.5 rounded-md">
                        <Phone size={12} /> +52 220 471 6091
                      </a>
                      <a href="mailto:avalusid@gmail.com" className="text-blue-400 text-[11px] hover:text-blue-300 transition flex items-center gap-1.5 bg-blue-400/10 px-3 py-1.5 rounded-md">
                        <Mail size={12} /> avalusid@gmail.com
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botón para regresar al panel si el admin solo estaba "probando" la vista pública */}
              {isAdmin && (
                <button 
                  onClick={() => {
                    setIsPublicView(false);
                    setCurrentView('list');
                    window.history.pushState({}, '', '/');
                  }} 
                  className="w-full mt-4 bg-red-600/10 hover:bg-red-600/20 text-red-500 font-medium py-3 px-4 rounded-xl border border-red-500/20 flex items-center justify-center gap-2 transition text-sm shadow-md"
                >
                  <ArrowLeft size={18} /> Volver a mi panel de Administrador
                </button>
              )}
            </div>
          )}

        </div>
        <div className="w-full bg-[#1a1a1a] py-4 px-4 text-center"><p className="text-white text-[10px] opacity-70">Desarrollado por AvalusID. Todos los derechos reservados.</p></div>
      </div>
    );
  }

  // --- VISTA 4: FORMULARIO DE EDICIÓN / CREACIÓN ---
  if (currentView === 'form') {
    return (
      <div className="min-h-screen bg-gray-100 p-4 md:p-8">
        <Analytics />
        <ErrorModal />
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="bg-blue-600 p-6 text-white flex items-center gap-4">
            <button onClick={() => setCurrentView('list')} className="hover:bg-blue-700 p-2 rounded-full transition"><ArrowLeft size={24} /></button>
            <h2 className="text-2xl font-bold">{formData.id ? 'Editar Credencial' : 'Agregar Nueva Credencial'}</h2>
          </div>
          <form onSubmit={handleSave} className="p-6 md:p-8 space-y-8">
            <section>
              <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4 flex items-center gap-2"><User size={20} className="text-blue-600"/> Datos del Personal</h3>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Foto de Perfil</label>
                <div className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden relative">
                  {formData.fotoPerfil ? <img src={formData.fotoPerfil} alt="Preview" className="w-full h-full object-cover" /> : <ImageIcon className="text-gray-400" />}
                  <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'fotoPerfil')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label><input type="text" name="nombre" required value={formData.nombre} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Apellidos</label><input type="text" name="apellidos" required value={formData.apellidos} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                
                {/* NUEVOS CAMPOS: CURP Y FECHA DE NACIMIENTO */}
                <div><label className="block text-sm font-medium text-gray-700 mb-1">CURP</label><input type="text" name="curp" value={formData.curp} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none uppercase" placeholder="18 Caracteres" maxLength={18} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento</label><input type="date" name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" /></div>

                <div><label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label><input type="text" name="empresa" required value={formData.empresa} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Puesto</label><input type="text" name="puesto" required value={formData.puesto} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              </div>
            </section>
            <section>
              <div className="flex items-center justify-between border-b pb-2 mb-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><FileText size={20} className="text-blue-600"/> Documentos Probatorios</h3>
                <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded">{formData.documentos.length} / 10</span>
              </div>
              <div className="space-y-4">
                {formData.documentos.map((doc) => (
                    <div key={doc.id} className="flex flex-col md:flex-row gap-3 items-start md:items-center bg-gray-50 p-3 rounded-xl border border-gray-200">
                      <div className="flex-1 w-full"><input type="text" placeholder="Nombre (Ej. DC3, INE...)" value={doc.nombre} onChange={(e) => updateDocumentName(doc.id, e.target.value)} className="w-full border border-gray-300 rounded-md p-2 outline-none text-sm" /></div>
                      <div className="flex-1 w-full relative">
                          <input type="file" accept=".pdf, image/jpeg, image/png" onChange={(e) => handleDynamicFileChange(e, doc.id)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                          <div className={`w-full flex items-center gap-2 border rounded-md p-2 transition text-sm ${doc.base64 ? 'bg-green-50 border-green-400 text-green-700' : 'bg-white border-gray-300 text-gray-600'}`}>
                            {doc.base64 ? <FileUp size={16}/> : <Upload size={16}/>}
                            <span className="truncate flex-1">{doc.base64 ? '¡Cargado!' : 'Seleccionar Archivo'}</span>
                          </div>
                      </div>
                      <button type="button" onClick={() => removeDocumentRow(doc.id)} className="p-2 text-gray-400 hover:text-red-600 transition"><Trash2 size={20} /></button>
                    </div>
                  ))}
                {formData.documentos.length < 10 && (
                  <button type="button" onClick={addDocumentRow} className="w-full py-3 border-2 border-dashed border-blue-300 text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition flex justify-center gap-2"><Plus size={20} /> Agregar Documento</button>
                )}
              </div>
            </section>
            <section>
              <div className="flex items-center justify-between border-b pb-2 mb-4"><h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Shield size={20} className="text-blue-600"/> Equipo <span className="text-sm font-normal text-gray-500 ml-1">(Opcional)</span></h3></div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Foto del Modelo</label>
                <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden relative">
                  {formData.fotoModelo ? <img src={formData.fotoModelo} alt="Preview" className="w-full h-full object-contain p-1" /> : <ImageIcon className="text-gray-400" />}
                  <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, 'fotoModelo')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">No Serie</label><input type="text" name="noSerie" value={formData.noSerie} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <div className="flex gap-2">
                    <input type="color" name="color" value={formData.color} onChange={handleInputChange} className="h-10 w-12 rounded cursor-pointer" />
                    <input type="text" name="color" value={formData.color} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md p-2 outline-none uppercase" />
                  </div>
                </div>
                <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label><input type="text" name="tipo" value={formData.tipo} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Modelo (Texto)</label><input type="text" name="modelo" value={formData.modelo} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              </div>
            </section>
            <div className="pt-4 border-t flex justify-end gap-3">
              <button type="button" onClick={() => setCurrentView('list')} className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-md font-medium transition" disabled={isSaving}>Cancelar</button>
              <button type="submit" disabled={isSaving} className="px-8 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold shadow-md transition flex items-center gap-2">{isSaving ? 'Guardando...' : (formData.id ? 'Actualizar Credencial' : 'Guardar Credencial')}</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // --- VISTA 5: DASHBOARD DE ADMINISTRADOR (Principal) ---
  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans">
      <Analytics />
      <ErrorModal />
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2"><Database className="text-blue-600" /> Sistema de Credenciales</h1>
            <p className="text-gray-600 text-sm md:text-base mt-1">Gestor conectado a Supabase</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsAdmin(false)} className="text-sm text-gray-500 hover:text-gray-800 transition font-medium">Cerrar Sesión</button>
            <button onClick={handleNewRecord} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition-all font-bold"><Plus size={20} /> Nuevo Registro</button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-10 text-gray-500 animate-pulse font-medium">Conectando a base de datos segura...</div>
        ) : credentials.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-10 text-center border border-gray-200">
            <Shield size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Base de datos vacía</h3>
            <p className="text-gray-500 mt-1">Presiona "Nuevo Registro" para agregar tu primera credencial.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {credentials.map(cred => (
              <div key={cred.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                <div className="p-5 flex items-start gap-4 flex-grow">
                  <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-gray-100 flex-shrink-0 overflow-hidden">
                    {cred.fotoPerfil ? <img src={cred.fotoPerfil} alt="Perfil" className="w-full h-full object-cover" /> : <User className="w-full h-full p-3 text-gray-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{cred.nombre} {cred.apellidos}</h3>
                    <p className="text-sm text-gray-500 truncate">{cred.puesto}</p>
                    <p className="text-xs font-bold text-blue-800 bg-blue-100 inline-block px-2 py-1 rounded mt-1 truncate max-w-full">{cred.empresa}</p>
                    
                    {/* ID VISUAL EN EL PANEL ADMIN (CON SOLUCIÓN PARA CREDENCIALES VIEJAS) */}
                    <div className="mt-2">
                      {cred.id_visual ? (
                        <span className="text-[10px] text-gray-500 font-mono bg-gray-100 border border-gray-200 px-2 py-1 rounded inline-block">
                          iD: {cred.id_visual}
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-600 font-mono bg-amber-50 border border-amber-200 px-2 py-1 rounded inline-block" title="Abre y guarda esta credencial para generarle un ID visual">
                          iD: Sin generar (Edita y guarda)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* BOTONES ACTUALIZADOS EN EL DASHBOARD */}
                <div className="bg-gray-50 px-4 py-3 border-t border-gray-100 flex justify-between items-center gap-2">
                  <button onClick={() => { 
                    setSelectedCred(cred); 
                    setIsPublicView(true); 
                    setCurrentView('detail'); 
                    window.history.pushState({}, '', `/credencialib/${cred.id}`);
                    window.scrollTo(0,0); 
                  }} className="flex-1 text-sm font-bold text-white hover:bg-blue-700 bg-blue-600 px-3 py-2 rounded-md flex items-center justify-center gap-1 shadow-sm transition" title="Ver cómo se ve en modo público">
                    <Eye size={14}/> Ver Público
                  </button>

                  <div className="flex items-center gap-1">
                    <button onClick={() => { 
                      setSelectedCred(cred); 
                      setIsPublicView(false); 
                      setCurrentView('detail'); 
                      window.scrollTo(0,0); 
                    }} className="text-gray-500 hover:text-blue-600 bg-white p-2 rounded shadow-sm border border-gray-200" title="Ver Internamente"><Lock size={16} /></button>
                    <button onClick={() => handleEditRecord(cred)} className="text-gray-500 hover:text-blue-600 bg-white p-2 rounded shadow-sm border border-gray-200" title="Editar"><Edit size={16} /></button>
                    <button onClick={() => { if(window.confirm('¿Eliminar registro para siempre?')) handleDelete(cred.id); }} className="text-gray-500 hover:text-red-500 bg-white p-2 rounded shadow-sm border border-gray-200" title="Eliminar"><Trash2 size={16} /></button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}