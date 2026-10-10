
export const CASES = [
  {
    id: "chair",
    title: "Чужое место",
    description: "Стул передвинут. Он должен стоять у стола.",
    type: "object",
    message: "СТУЛ НЕ ДОЛЖЕН БЫТЬ ТАМ."
  },
  {
    id: "light",
    title: "Мигающий свет",
    description: "Лампа ведёт себя неправильно.",
    type: "light",
    message: "СВЕТ МИГАЕТ. ПРОВЕРЬ ПОМЕЩЕНИЕ."
  },
  {
    id: "paper",
    title: "Лишний документ",
    description: "На столе лежит незнакомая бумага.",
    type: "paper",
    message: "ТЫ НЕ ПЕЧАТАЛ ЭТОТ ДОКУМЕНТ."
  },
  {
    id: "shadow",
    title: "Вторая тень",
    description: "У стены появилась чужая тень.",
    type: "shadow",
    message: "НЕ ОБОРАЧИВАЙСЯ СЛИШКОМ РЕЗКО."
  },
  {
    id: "door",
    title: "Открытая дверь",
    description: "Дверь была закрыта в начале смены.",
    type: "door",
    message: "ДВЕРЬ ОТКРЫТА."
  },
  {
    id: "monitor",
    title: "Неправильное время",
    description: "Монитор показывает 13:13.",
    type: "monitor",
    message: "ЭТО ВРЕМЯ НЕ СУЩЕСТВУЕТ."
  },
  {
    id: "phone",
    title: "Телефон",
    description: "Телефон звонит, хотя кабель отключён.",
    type: "phone",
    message: "НЕ ОТВЕЧАЙ НА НЕЗНАКОМЫЕ ЗВОНКИ."
  },
  {
    id: "plant",
    title: "Сухое растение",
    description: "Растение изменилось за несколько секунд.",
    type: "plant",
    message: "ТЫ ПОМНИШЬ, КАК ОНО ВЫГЛЯДЕЛО?"
  },
  {
    id: "clock",
    title: "Замершие часы",
    description: "Стрелки перестали двигаться.",
    type: "clock",
    message: "ВРЕМЯ ЗДЕСЬ НЕ ИДЁТ."
  },
  {
    id: "printer",
    title: "Самостоятельная печать",
    description: "Принтер печатает пустые страницы.",
    type: "printer",
    message: "НЕ ЗАГЛЯДЫВАЙ ВНУТРЬ."
  },
  {
    id: "cabinet",
    title: "Шкаф",
    description: "Внутри слышится стук.",
    type: "cabinet",
    message: "В ШКАФУ КТО-ТО ЕСТЬ."
  },
  {
    id: "window",
    title: "Окно",
    description: "За окном не та улица.",
    type: "window",
    message: "НЕ СМОТРИ В ОКНО ДОЛЬШЕ НЕСКОЛЬКИХ СЕКУНД."
  },
  {
    id: "duplicate",
    title: "Дубликат",
    description: "Ты видишь второй экземпляр одного предмета.",
    type: "duplicate",
    message: "ОДИН ИЗ НИХ ЛИШНИЙ."
  }
];

export function getRandomCase(exclude = []) {
  const available = CASES.filter(item => !exclude.includes(item.id));
  if (!available.length) return null;
  return available[Math.floor(Math.random() * available.length)];
}