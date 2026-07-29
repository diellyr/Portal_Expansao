import { YOUTH_STATUS } from "../config/constants.js";

const CITY_NAMES = [
  "Praia Grande", "Santos", "São Vicente", "Guarujá", "Cubatão",
  "Mongaguá", "Itanhaém", "Peruíbe", "Bertioga",
];

const FIRST_NAMES = [
  "Ana", "Bruno", "Carlos", "Daniela", "Eduardo", "Fernanda", "Gabriel", "Helena",
  "Igor", "Julia", "Kaique", "Larissa", "Marcos", "Natália", "Otávio", "Patrícia",
  "Rafael", "Sofia", "Tiago", "Vitória", "William", "Yasmin", "Bianca", "Caio",
  "Débora", "Enzo", "Flávia", "Gustavo", "Isabela", "João",
];
const LAST_NAMES = [
  "Silva", "Souza", "Oliveira", "Santos", "Pereira", "Costa", "Rodrigues", "Almeida",
  "Nascimento", "Lima", "Araújo", "Fernandes", "Carvalho", "Gomes", "Martins",
];

const INSTRUMENTS = ["violão", "teclado", "bateria", "baixo", "flauta", "violino", "guitarra"];
const NEIGHBORHOODS = ["Centro", "Boqueirão", "Aparecida", "Gonzaga", "Embaré", "Jardim América", "Vila Nova"];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomBool(trueChance = 0.5) {
  return Math.random() < trueChance;
}
function randomDateBetween(startYear, endYear) {
  const start = new Date(startYear, 0, 1).getTime();
  const end = new Date(endYear, 11, 31).getTime();
  const d = new Date(start + Math.random() * (end - start));
  return d.toISOString().slice(0, 10);
}

function makeId() {
  return crypto.randomUUID();
}

export function generateDemoData() {
  const now = new Date().toISOString();
  const cities = CITY_NAMES.map((nome, i) => ({
    id: makeId(),
    nome,
    estado: "SP",
    liderCidade: `Líder ${nome}`,
    conselheiroCidade: `Conselheiro ${randomItem(FIRST_NAMES)} ${randomItem(LAST_NAMES)}`,
    telefoneLider: "(13) 9" + String(90000000 + i * 1111).padStart(8, "0"),
    pastorResponsavel: `Pr. ${randomItem(FIRST_NAMES)} ${randomItem(LAST_NAMES)}`,
    ativo: true,
    isDemo: true,
    createdAt: now,
    updatedAt: now,
  }));

  const congregations = [];
  cities.forEach((city, idx) => {
    const count = idx < 3 ? 3 : 2; // first three cities get 3 congregations, rest get 2
    for (let i = 0; i < count; i++) {
      congregations.push({
        id: makeId(),
        cidadeId: city.id,
        nome: `${city.nome} - Congregação ${i + 1}`,
        bairro: randomItem(NEIGHBORHOODS),
        endereco: `Rua ${randomItem(LAST_NAMES)}, ${100 + i * 10}`,
        pastor: `Pr. ${randomItem(FIRST_NAMES)} ${randomItem(LAST_NAMES)}`,
        conselheiroLocal: `${randomItem(FIRST_NAMES)} ${randomItem(LAST_NAMES)}`,
        telefoneConselheiro: "(13) 9" + String(80000000 + congregations.length * 777).padStart(8, "0"),
        ativo: true,
        isDemo: true,
        createdAt: now,
        updatedAt: now,
      });
    }
  });

  const statuses = Object.values(YOUTH_STATUS);
  const youth = [];
  const totalYouth = 96;
  for (let i = 0; i < totalYouth; i++) {
    const congregation = randomItem(congregations);
    const status = statuses[i % statuses.length];
    const birthYear = 2026 - (12 + Math.floor(Math.random() * 30));
    const hasBirthDate = randomBool(0.92);
    const hasBaptism = randomBool(0.55);
    const prega = randomBool(0.25);
    const canta = randomBool(0.35);
    const hasInstrument = randomBool(0.3);
    const sexo = randomBool(0.92) ? (randomBool(0.5) ? "masculino" : "feminino") : "";
    const semIgreja = randomBool(0.06);
    youth.push({
      id: makeId(),
      nome: `${randomItem(FIRST_NAMES)} ${randomItem(LAST_NAMES)}`,
      dataNascimento: hasBirthDate ? randomDateBetween(birthYear, birthYear) : null,
      sexo,
      telefone: randomBool(0.85) ? "(13) 9" + String(70000000 + i * 333).padStart(8, "0") : "",
      bairro: randomItem(NEIGHBORHOODS),
      cidadeId: congregation.cidadeId,
      congregacaoId: semIgreja ? null : congregation.id,
      status,
      nomePai: randomBool(0.7) ? `${randomItem(FIRST_NAMES)} ${randomItem(LAST_NAMES)}` : "",
      nomeMae: randomBool(0.8) ? `${randomItem(FIRST_NAMES)} ${randomItem(LAST_NAMES)}` : "",
      pastor: congregation.pastor,
      conselheiroLocal: congregation.conselheiroLocal,
      conselheiroCidade: cities.find((c) => c.id === congregation.cidadeId)?.conselheiroCidade || "",
      dataBatismoAguas: hasBaptism ? randomDateBetween(2015, 2026) : null,
      batizadoEspiritoSanto: randomBool(0.4),
      instrumento: hasInstrument ? randomItem(INSTRUMENTS) : "",
      prega,
      canta,
      outrosTalentos: randomBool(0.2) ? "Teatro, dança" : "",
      observacoes: "",
      dataEntrada: randomDateBetween(2018, 2026),
      ativo: status !== "inativo",
      isDemo: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  const eventTypes = ["culto", "vigilia", "congresso", "ensaio", "evangelismo", "reuniao", "palestra", "retiro", "outro"];
  const events = [];
  for (let i = 0; i < 16; i++) {
    const city = randomItem(cities);
    const cityCongregations = congregations.filter((c) => c.cidadeId === city.id);
    const daysOffset = -40 + i * 6;
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    events.push({
      id: makeId(),
      titulo: `${randomItem(eventTypes).toUpperCase()} Regional ${i + 1}`,
      tipo: randomItem(eventTypes),
      data: date.toISOString().slice(0, 10),
      horario: randomBool() ? "19:30" : "09:00",
      cidadeId: city.id,
      congregacaoId: cityCongregations.length ? randomItem(cityCongregations).id : null,
      regional: randomBool(0.3),
      local: `Templo ${city.nome}`,
      descricao: "Evento gerado para demonstração.",
      isDemo: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  return { cities, congregations, youth, events };
}
