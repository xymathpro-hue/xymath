// ============================================================
// XYMATH - MODAL FICHA DO ALUNO
// src/components/alunos/FichaAlunoModal.tsx
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  FileText, 
  Plus, 
  Edit2, 
  Trash2, 
  Save,
  AlertCircle,
  Users,
  Building,
  TrendingUp,
  Heart,
  Settings,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle
} from 'lucide-react';
import { useFichaAluno } from '@/hooks/useFichaAluno';
import { 
  TIPOS_ANOTACAO_CONFIG, 
  TIPOS_LAUDO_OPTIONS,
  type TipoAnotacao,
  type TipoLaudo
} from '@/types/ficha-aluno';

interface FichaAlunoModalProps {
  alunoId: string;
  isOpen: boolean;
  onClose: () => void;
}

// Ícones por tipo de anotação
const IconeAnotacao: Record<TipoAnotacao, React.ReactNode> = {
  geral: <FileText className="w-4 h-4" />,
  reuniao: <Users className="w-4 h-4" />,
  coordenacao: <Building className="w-4 h-4" />,
  comportamento: <AlertCircle className="w-4 h-4" />,
  desempenho: <TrendingUp className="w-4 h-4" />,
  saude: <Heart className="w-4 h-4" />,
  adaptacao: <Settings className="w-4 h-4" />
};

export default function FichaAlunoModal({ alunoId, isOpen, onClose }: FichaAlunoModalProps) {
  const {
    ficha,
    anotacoes,
    loading,
    error,
    carregarFicha,
    atualizarDadosPedagogicos,
    adicionarAnotacao,
    editarAnotacao,
    excluirAnotacao
  } = useFichaAluno();

  // Estados do formulário
  const [possuiLaudo, setPossuiLaudo] = useState(false);
  const [tipoLaudo, setTipoLaudo] = useState<TipoLaudo | ''>('');
  const [observacoes, setObservacoes] = useState('');
  const [editandoDados, setEditandoDados] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  // Estados para anotações
  const [mostrarFormAnotacao, setMostrarFormAnotacao] = useState(false);
  const [novaAnotacaoTexto, setNovaAnotacaoTexto] = useState('');
  const [novaAnotacaoTipo, setNovaAnotacaoTipo] = useState<TipoAnotacao>('geral');
  const [anotacaoEditando, setAnotacaoEditando] = useState<string | null>(null);
  const [anotacaoEditandoTexto, setAnotacaoEditandoTexto] = useState('');
  const [anotacaoEditandoTipo, setAnotacaoEditandoTipo] = useState<TipoAnotacao>('geral');
  const [expandirAnotacoes, setExpandirAnotacoes] = useState(false);

  // Carregar dados ao abrir
  useEffect(() => {
    if (isOpen && alunoId) {
      carregarFicha(alunoId);
    }
  }, [isOpen, alunoId, carregarFicha]);

  // Preencher formulário quando carregar ficha
  useEffect(() => {
    if (ficha) {
      setPossuiLaudo(ficha.aluno.possui_laudo);
      setTipoLaudo(ficha.aluno.tipo_laudo || '');
      setObservacoes(ficha.aluno.observacoes_pedagogicas || '');
    }
  }, [ficha]);

  // Limpar mensagem de sucesso após 3 segundos
  useEffect(() => {
    if (mensagemSucesso) {
      const timer = setTimeout(() => setMensagemSucesso(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [mensagemSucesso]);

  // Salvar dados pedagógicos
  const handleSalvarDados = async () => {
    if (!ficha) return;
    
    setSalvando(true);
    const sucesso = await atualizarDadosPedagogicos(ficha.aluno.id, {
      possui_laudo: possuiLaudo,
      tipo_laudo: tipoLaudo || null,
      observacoes_pedagogicas: observacoes || null
    });
    
    if (sucesso) {
      setEditandoDados(false);
      setMensagemSucesso('Dados salvos com sucesso!');
    }
    setSalvando(false);
  };

  // Adicionar anotação
  const handleAdicionarAnotacao = async () => {
    if (!ficha || !novaAnotacaoTexto.trim()) return;
    
    const sucesso = await adicionarAnotacao({
      aluno_id: ficha.aluno.id,
      texto: novaAnotacaoTexto.trim(),
      tipo: novaAnotacaoTipo
    });
    
    if (sucesso) {
      setNovaAnotacaoTexto('');
      setNovaAnotacaoTipo('geral');
      setMostrarFormAnotacao(false);
      setMensagemSucesso('Anotação adicionada!');
    }
  };

  // Salvar edição de anotação
  const handleSalvarEdicaoAnotacao = async () => {
    if (!anotacaoEditando || !anotacaoEditandoTexto.trim()) return;
    
    const sucesso = await editarAnotacao(
      anotacaoEditando, 
      anotacaoEditandoTexto.trim(),
      anotacaoEditandoTipo
    );
    
    if (sucesso) {
      setAnotacaoEditando(null);
      setMensagemSucesso('Anotação atualizada!');
    }
  };

  // Excluir anotação
  const handleExcluirAnotacao = async (anotacaoId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta anotação?')) return;
    
    const sucesso = await excluirAnotacao(anotacaoId);
    if (sucesso) {
      setMensagemSucesso('Anotação excluída!');
    }
  };

  // Iniciar edição de anotação
  const iniciarEdicaoAnotacao = (anotacao: typeof anotacoes[0]) => {
    setAnotacaoEditando(anotacao.id);
    setAnotacaoEditandoTexto(anotacao.texto);
    setAnotacaoEditandoTipo(anotacao.tipo);
  };

  // Formatar data
  const formatarData = (dataString: string) => {
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {loading ? 'Carregando...' : ficha?.aluno.nome || 'Ficha do Aluno'}
              </h2>
              {ficha && (
                <p className="text-sm text-gray-500">
                  {ficha.turma.nome} • Matrícula: {ficha.aluno.matricula}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Mensagem de sucesso */}
        {mensagemSucesso && (
          <div className="mx-4 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-green-800 text-sm">{mensagemSucesso}</span>
          </div>
        )}

        {/* Erro */}
        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-red-800 text-sm">{error}</span>
          </div>
        )}

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : ficha ? (
            <>
              {/* Seção: Informações Pedagógicas */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-900 font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Informações Pedagógicas
                  </h3>
                  {!editandoDados ? (
                    <button
                      onClick={() => setEditandoDados(true)}
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Edit2 className="w-4 h-4" />
                      Editar
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditandoDados(false);
                          setPossuiLaudo(ficha.aluno.possui_laudo);
                          setTipoLaudo(ficha.aluno.tipo_laudo || '');
                          setObservacoes(ficha.aluno.observacoes_pedagogicas || '');
                        }}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSalvarDados}
                        disabled={salvando}
                        className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded flex items-center gap-1 disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        {salvando ? 'Salvando...' : 'Salvar'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Checkbox Possui Laudo */}
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={possuiLaudo}
                        onChange={(e) => setPossuiLaudo(e.target.checked)}
                        disabled={!editandoDados}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                      />
                      <span className="text-gray-700">Possui laudo</span>
                    </label>
                    {possuiLaudo && (
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded font-medium">
                        Aluno com laudo
                      </span>
                    )}
                  </div>

                  {/* Tipo de Laudo */}
                  {possuiLaudo && (
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Tipo de laudo (opcional)
                      </label>
                      <select
                        value={tipoLaudo}
                        onChange={(e) => setTipoLaudo(e.target.value as TipoLaudo)}
                        disabled={!editandoDados}
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 disabled:opacity-50 disabled:bg-gray-100"
                      >
                        <option value="">Selecione ou deixe em branco</option>
                        {TIPOS_LAUDO_OPTIONS.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label} - {option.descricao}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Observações Pedagógicas */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Observações pedagógicas
                    </label>
                    <textarea
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      disabled={!editandoDados}
                      placeholder="Ex: Dificuldade de leitura, precisa sentar na frente, adaptação de atividades..."
                      rows={3}
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 disabled:opacity-50 disabled:bg-gray-100 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Seção: Anotações */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-900 font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-600" />
                    Anotações ({ficha.estatisticas.total_anotacoes})
                  </h3>
                  <button
                    onClick={() => setMostrarFormAnotacao(!mostrarFormAnotacao)}
                    className="text-sm bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Nova Anotação
                  </button>
                </div>

                {/* Formulário Nova Anotação */}
                {mostrarFormAnotacao && (
                  <div className="mb-4 p-3 bg-white border border-gray-200 rounded-lg space-y-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Tipo</label>
                      <select
                        value={novaAnotacaoTipo}
                        onChange={(e) => setNovaAnotacaoTipo(e.target.value as TipoAnotacao)}
                        className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 text-sm"
                      >
                        {Object.entries(TIPOS_ANOTACAO_CONFIG).map(([key, config]) => (
                          <option key={key} value={key}>{config.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Anotação</label>
                      <textarea
                        value={novaAnotacaoTexto}
                        onChange={(e) => setNovaAnotacaoTexto(e.target.value)}
                        placeholder="Digite sua anotação..."
                        rows={3}
                        className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 placeholder-gray-400 text-sm resize-none"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setMostrarFormAnotacao(false);
                          setNovaAnotacaoTexto('');
                          setNovaAnotacaoTipo('geral');
                        }}
                        className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleAdicionarAnotacao}
                        disabled={!novaAnotacaoTexto.trim()}
                        className="text-sm bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded disabled:opacity-50"
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>
                )}

                {/* Lista de Anotações */}
                <div className="space-y-3">
                  {anotacoes.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      Nenhuma anotação registrada
                    </p>
                  ) : (
                    <>
                      {(expandirAnotacoes ? anotacoes : anotacoes.slice(0, 5)).map((anotacao) => {
                        const config = TIPOS_ANOTACAO_CONFIG[anotacao.tipo];
                        const editando = anotacaoEditando === anotacao.id;

                        return (
                          <div
                            key={anotacao.id}
                            className={`p-3 rounded-lg border bg-white border-gray-200`}
                          >
                            {editando ? (
                              <div className="space-y-2">
                                <select
                                  value={anotacaoEditandoTipo}
                                  onChange={(e) => setAnotacaoEditandoTipo(e.target.value as TipoAnotacao)}
                                  className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-gray-900 text-sm"
                                >
                                  {Object.entries(TIPOS_ANOTACAO_CONFIG).map(([key, cfg]) => (
                                    <option key={key} value={key}>{cfg.label}</option>
                                  ))}
                                </select>
                                <textarea
                                  value={anotacaoEditandoTexto}
                                  onChange={(e) => setAnotacaoEditandoTexto(e.target.value)}
                                  rows={2}
                                  className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-gray-900 text-sm resize-none"
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => setAnotacaoEditando(null)}
                                    className="text-xs text-gray-500 hover:text-gray-700"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    onClick={handleSalvarEdicaoAnotacao}
                                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
                                  >
                                    Salvar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className={config.cor}>
                                      {IconeAnotacao[anotacao.tipo]}
                                    </span>
                                    <span className={`text-xs ${config.cor} font-medium`}>
                                      {config.label}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      {formatarData(anotacao.created_at)}
                                    </span>
                                  </div>
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => iniciarEdicaoAnotacao(anotacao)}
                                      className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleExcluirAnotacao(anotacao.id)}
                                      className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-red-500"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                                <p className="text-gray-700 text-sm mt-2 whitespace-pre-wrap">
                                  {anotacao.texto}
                                </p>
                              </>
                            )}
                          </div>
                        );
                      })}

                      {/* Botão expandir/recolher */}
                      {anotacoes.length > 5 && (
                        <button
                          onClick={() => setExpandirAnotacoes(!expandirAnotacoes)}
                          className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1"
                        >
                          {expandirAnotacoes ? (
                            <>
                              <ChevronUp className="w-4 h-4" />
                              Mostrar menos
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4" />
                              Ver todas ({anotacoes.length - 5} mais)
                            </>
                          )}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
