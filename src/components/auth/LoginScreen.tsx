import { Globe, Grid } from 'lucide-react';

type LoginScreenProps = {
  onLoginGoogle: () => void;
  onLoginGuest: () => void;
  loading: boolean;
  collabEnabled: boolean;
};

export const LoginScreen = ({
  onLoginGoogle,
  onLoginGuest,
  loading,
  collabEnabled,
}: LoginScreenProps) => (
  <div className="w-full h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
    <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-slate-100 text-center">
      <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 mx-auto mb-6">
        <Grid className="text-white" size={32} />
      </div>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">
        BrModelo<span className="text-indigo-600">Plus</span>
      </h1>
      <p className="text-slate-500 mb-8">
        {collabEnabled
          ? 'Modelagem de dados moderna na nuvem.'
          : 'Modelagem de dados moderna — modo local.'}
      </p>

      {!collabEnabled && (
        <div className="mb-6 p-3 bg-amber-50 border border-amber-100 rounded-xl text-left">
          <p className="text-xs text-amber-700 font-medium">
            Firebase não configurado. Colaboração em tempo real desabilitada; projetos ficam só
            neste navegador.
          </p>
        </div>
      )}

      {collabEnabled && (
        <button
          onClick={onLoginGoogle}
          disabled={loading}
          className="w-full py-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-3"
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Globe size={18} className="text-indigo-600" /> Entrar com Google
            </>
          )}
        </button>
      )}

      <button
        onClick={onLoginGuest}
        disabled={loading}
        className={`w-full py-3.5 rounded-xl font-medium text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
          collabEnabled
            ? 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
            : 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-200'
        }`}
      >
        {collabEnabled ? 'Continuar como Convidado' : 'Continuar no modo local'}
      </button>

      <p className="text-xs text-slate-300 mt-6">
        {collabEnabled
          ? 'Ao usar o modo convidado, os dados podem ser perdidos ao limpar o navegador.'
          : 'Configure VITE_FIREBASE_API_KEY no .env para habilitar nuvem e colaboração.'}
      </p>
    </div>
  </div>
);
