// Dados das habilidades BNCC para Matemática
export const componentesCurriculares = [
  { id: 'mat', codigo: 'MAT', nome: 'Matemática' },
  { id: 'por', codigo: 'POR', nome: 'Língua Portuguesa' },
  { id: 'cie', codigo: 'CIE', nome: 'Ciências' },
]

export const descritoresMat = [
  { id: 'd1', codigo: 'D1', descricao: 'Identificar a localização e movimentação de objeto em mapas, croquis e outras representações gráficas' },
  { id: 'd2', codigo: 'D2', descricao: 'Identificar propriedades comuns e diferenças entre figuras bidimensionais e tridimensionais' },
  { id: 'd3', codigo: 'D3', descricao: 'Identificar propriedades comuns e diferenças entre poliedros e corpos redondos' },
  { id: 'd4', codigo: 'D4', descricao: 'Identificar quadriláteros observando as relações entre seus lados' },
  { id: 'd5', codigo: 'D5', descricao: 'Reconhecer a conservação ou modificação de medidas dos lados, do perímetro, da área em ampliação ou redução de figuras' },
  { id: 'd6', codigo: 'D6', descricao: 'Estimar a medida de grandezas utilizando unidades de medida convencionais ou não' },
  { id: 'd7', codigo: 'D7', descricao: 'Resolver problemas significativos utilizando unidades de medida padronizadas' },
  { id: 'd8', codigo: 'D8', descricao: 'Estabelecer relações entre unidades de medida de tempo' },
  { id: 'd9', codigo: 'D9', descricao: 'Estabelecer relações entre o horário de início e término e/ou o intervalo da duração de um evento ou acontecimento' },
  { id: 'd10', codigo: 'D10', descricao: 'Num problema, estabelecer trocas entre cédulas e moedas do sistema monetário brasileiro' },
  { id: 'd11', codigo: 'D11', descricao: 'Resolver problema envolvendo o cálculo do perímetro de figuras planas' },
  { id: 'd12', codigo: 'D12', descricao: 'Resolver problema envolvendo o cálculo ou estimativa de áreas de figuras planas' },
  { id: 'd13', codigo: 'D13', descricao: 'Reconhecer e utilizar características do sistema de numeração decimal' },
  { id: 'd14', codigo: 'D14', descricao: 'Identificar a localização de números naturais na reta numérica' },
  { id: 'd15', codigo: 'D15', descricao: 'Reconhecer a decomposição de números naturais nas suas diversas ordens' },
  { id: 'd16', codigo: 'D16', descricao: 'Reconhecer a composição e a decomposição de números naturais em sua forma polinomial' },
  { id: 'd17', codigo: 'D17', descricao: 'Calcular o resultado de uma adição ou subtração de números naturais' },
  { id: 'd18', codigo: 'D18', descricao: 'Calcular o resultado de uma multiplicação ou divisão de números naturais' },
  { id: 'd19', codigo: 'D19', descricao: 'Resolver problema com números naturais, envolvendo diferentes significados da adição ou subtração' },
  { id: 'd20', codigo: 'D20', descricao: 'Resolver problema com números naturais, envolvendo diferentes significados da multiplicação ou divisão' },
  { id: 'd21', codigo: 'D21', descricao: 'Identificar diferentes representações de um mesmo número racional' },
  { id: 'd22', codigo: 'D22', descricao: 'Identificar a localização de números racionais representados na forma decimal na reta numérica' },
  { id: 'd23', codigo: 'D23', descricao: 'Resolver problema utilizando a escrita decimal de cédulas e moedas do sistema monetário brasileiro' },
  { id: 'd24', codigo: 'D24', descricao: 'Identificar fração como representação que pode estar associada a diferentes significados' },
  { id: 'd25', codigo: 'D25', descricao: 'Resolver problema com números racionais expressos na forma decimal envolvendo diferentes significados da adição ou subtração' },
  { id: 'd26', codigo: 'D26', descricao: 'Resolver problema envolvendo noções de porcentagem' },
  { id: 'd27', codigo: 'D27', descricao: 'Ler informações e dados apresentados em tabelas' },
  { id: 'd28', codigo: 'D28', descricao: 'Ler informações e dados apresentados em gráficos' },
]

export const habilidadesBNCC = {
  mat: {
    '6º ano EF': [
      { id: 'ef06ma01', codigo: 'EF06MA01', descricao: 'Comparar, ordenar, ler e escrever números naturais e números racionais na representação decimal com compreensão' },
      { id: 'ef06ma02', codigo: 'EF06MA02', descricao: 'Reconhecer o sistema de numeração decimal como o que prevaleceu no mundo ocidental' },
      { id: 'ef06ma03', codigo: 'EF06MA03', descricao: 'Resolver e elaborar problemas que envolvam cálculos com números naturais' },
      { id: 'ef06ma04', codigo: 'EF06MA04', descricao: 'Construir algoritmo em linguagem natural e representá-lo por fluxograma' },
      { id: 'ef06ma05', codigo: 'EF06MA05', descricao: 'Classificar números naturais em primos e compostos' },
      { id: 'ef06ma06', codigo: 'EF06MA06', descricao: 'Resolver e elaborar problemas que envolvam as ideias de múltiplo e de divisor' },
      { id: 'ef06ma07', codigo: 'EF06MA07', descricao: 'Compreender, comparar e ordenar frações associadas às ideias de partes de inteiros' },
      { id: 'ef06ma08', codigo: 'EF06MA08', descricao: 'Reconhecer que os números racionais positivos podem ser expressos nas formas fracionária e decimal' },
      { id: 'ef06ma09', codigo: 'EF06MA09', descricao: 'Resolver e elaborar problemas que envolvam o cálculo da fração de uma quantidade' },
      { id: 'ef06ma10', codigo: 'EF06MA10', descricao: 'Resolver e elaborar problemas que envolvam adição ou subtração com números racionais positivos na representação fracionária' },
      { id: 'ef06ma11', codigo: 'EF06MA11', descricao: 'Resolver e elaborar problemas com números racionais positivos na representação decimal' },
      { id: 'ef06ma12', codigo: 'EF06MA12', descricao: 'Fazer estimativas de quantidades e aproximar números para múltiplos da potência de 10 mais próxima' },
      { id: 'ef06ma13', codigo: 'EF06MA13', descricao: 'Resolver e elaborar problemas que envolvam porcentagens' },
    ],
    '7º ano EF': [
      { id: 'ef07ma01', codigo: 'EF07MA01', descricao: 'Resolver e elaborar problemas com números naturais, envolvendo as noções de divisor e de múltiplo' },
      { id: 'ef07ma02', codigo: 'EF07MA02', descricao: 'Resolver e elaborar problemas que envolvam porcentagens' },
      { id: 'ef07ma03', codigo: 'EF07MA03', descricao: 'Comparar e ordenar números inteiros em diferentes contextos' },
      { id: 'ef07ma04', codigo: 'EF07MA04', descricao: 'Resolver e elaborar problemas que envolvam operações com números inteiros' },
      { id: 'ef07ma05', codigo: 'EF07MA05', descricao: 'Resolver um mesmo problema utilizando diferentes algoritmos' },
      { id: 'ef07ma06', codigo: 'EF07MA06', descricao: 'Reconhecer que as resoluções de um grupo de problemas que têm a mesma estrutura podem ser obtidas utilizando os mesmos procedimentos' },
      { id: 'ef07ma07', codigo: 'EF07MA07', descricao: 'Representar por meio de um fluxograma os passos utilizados para resolver um grupo de problemas' },
      { id: 'ef07ma08', codigo: 'EF07MA08', descricao: 'Comparar e ordenar frações associadas às ideias de partes de inteiros, resultado da divisão, razão e operador' },
      { id: 'ef07ma09', codigo: 'EF07MA09', descricao: 'Utilizar, na resolução de problemas, a associação entre razão e fração' },
      { id: 'ef07ma10', codigo: 'EF07MA10', descricao: 'Comparar e ordenar números racionais em diferentes contextos' },
      { id: 'ef07ma11', codigo: 'EF07MA11', descricao: 'Compreender e utilizar a multiplicação e a divisão de números racionais' },
      { id: 'ef07ma12', codigo: 'EF07MA12', descricao: 'Resolver e elaborar problemas que envolvam as operações com números racionais' },
    ],
    '8º ano EF': [
      { id: 'ef08ma01', codigo: 'EF08MA01', descricao: 'Efetuar cálculos com potências de expoentes inteiros e aplicar esse conhecimento na representação de números em notação científica' },
      { id: 'ef08ma02', codigo: 'EF08MA02', descricao: 'Resolver e elaborar problemas usando a relação entre potenciação e radiciação' },
      { id: 'ef08ma03', codigo: 'EF08MA03', descricao: 'Resolver e elaborar problemas de contagem cuja resolução envolva a aplicação do princípio multiplicativo' },
      { id: 'ef08ma04', codigo: 'EF08MA04', descricao: 'Resolver e elaborar problemas, envolvendo cálculo de porcentagens' },
      { id: 'ef08ma05', codigo: 'EF08MA05', descricao: 'Reconhecer e utilizar procedimentos para a obtenção de uma fração geratriz para uma dízima periódica' },
      { id: 'ef08ma06', codigo: 'EF08MA06', descricao: 'Resolver e elaborar problemas que envolvam cálculo do valor numérico de expressões algébricas' },
      { id: 'ef08ma07', codigo: 'EF08MA07', descricao: 'Associar uma equação linear de 1º grau com duas incógnitas a uma reta no plano cartesiano' },
      { id: 'ef08ma08', codigo: 'EF08MA08', descricao: 'Resolver e elaborar problemas relacionados ao seu contexto próximo, que possam ser representados por sistemas de equações de 1º grau' },
      { id: 'ef08ma09', codigo: 'EF08MA09', descricao: 'Resolver e elaborar, com e sem uso de tecnologias, problemas que possam ser representados por equações polinomiais de 2º grau' },
    ],
    '9º ano EF': [
      { id: 'ef09ma01', codigo: 'EF09MA01', descricao: 'Reconhecer que, uma vez fixada uma unidade de comprimento, existem segmentos de reta cujo comprimento não é expresso por número racional' },
      { id: 'ef09ma02', codigo: 'EF09MA02', descricao: 'Reconhecer um número irracional como um número real cuja representação decimal é infinita e não periódica' },
      { id: 'ef09ma03', codigo: 'EF09MA03', descricao: 'Efetuar cálculos com números reais, inclusive potências com expoentes fracionários' },
      { id: 'ef09ma04', codigo: 'EF09MA04', descricao: 'Resolver e elaborar problemas com números reais, inclusive em notação científica' },
      { id: 'ef09ma05', codigo: 'EF09MA05', descricao: 'Resolver e elaborar problemas que envolvam porcentagens' },
      { id: 'ef09ma06', codigo: 'EF09MA06', descricao: 'Compreender as funções como relações de dependência unívoca entre duas variáveis' },
      { id: 'ef09ma07', codigo: 'EF09MA07', descricao: 'Resolver problemas que envolvam a razão entre duas grandezas de espécies diferentes' },
      { id: 'ef09ma08', codigo: 'EF09MA08', descricao: 'Resolver e elaborar problemas que envolvam relações de proporcionalidade direta e inversa entre duas ou mais grandezas' },
      { id: 'ef09ma09', codigo: 'EF09MA09', descricao: 'Compreender os processos de fatoração de expressões algébricas' },
    ],
    '1º ano EM': [
      { id: 'em13mat101', codigo: 'EM13MAT101', descricao: 'Interpretar criticamente situações econômicas, sociais e fatos relativos às Ciências da Natureza que envolvam a variação de grandezas' },
      { id: 'em13mat102', codigo: 'EM13MAT102', descricao: 'Analisar tabelas, gráficos e amostras de pesquisas estatísticas apresentadas em relatórios' },
      { id: 'em13mat103', codigo: 'EM13MAT103', descricao: 'Interpretar e compreender textos científicos ou divulgados pelas mídias, que empregam unidades de medida de diferentes grandezas' },
      { id: 'em13mat104', codigo: 'EM13MAT104', descricao: 'Utilizar as noções de transformações isométricas e homotéticas para analisar diferentes produções humanas' },
      { id: 'em13mat105', codigo: 'EM13MAT105', descricao: 'Utilizar as noções de transformações isométricas e homotéticas para construir figuras e analisar elementos da natureza' },
    ],
  }
}

export function getHabilidadesByAnoSerie(componente: string, anoSerie: string) {
  const compData = habilidadesBNCC[componente as keyof typeof habilidadesBNCC]
  if (!compData) return []
  return compData[anoSerie as keyof typeof compData] || []
}

export function getDescritoresByComponente(componente: string) {
  if (componente === 'mat') return descritoresMat
  return []
}
