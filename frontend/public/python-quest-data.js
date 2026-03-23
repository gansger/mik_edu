/**
 * Уровни Python Quest: теория (HTML) + практика (проверка по тексту кода).
 * Подключается из python-quest.html до основного скрипта.
 */
(function () {
  function T(html) {
    return html;
  }

  window.__PYTHON_QUEST_LEVELS = [
    {
      title: 'Уровень 1: Общая информация о курсе',
      theory: T(`<p>Курс <strong>Python Quest</strong> сочетает теорию и короткие практические задания. Вы пишете фрагменты кода; проверка идёт безопасно (без запуска кода на сервере).</p>
<h3>Как учиться</h3>
<ul><li>Читайте теорию сверху вниз.</li><li>Выполните задание в поле ниже.</li><li>Используйте «Подсказку», если застряли.</li></ul>
<h3>Python</h3>
<p>Python — высокоуровневый язык с простым синтаксисом, популярен в науке о данных, веб-разработке и автоматизации.</p>`),
      task: 'Напишите одну строку: вызов print с текстом Hello (в кавычках), чтобы показать приветствие.',
      hint: 'print("Hello")',
      check: (c) => c.includes('print') && /hello/i.test(c),
    },
    {
      title: 'Уровень 2: Программы и Python',
      theory: T(`<p><strong>Программа</strong> — это последовательность инструкций для компьютера. Инструкции выполняет <strong>интерпретатор Python</strong> построчно.</p>
<h3>Файлы и запуск</h3>
<p>Код обычно хранят в файлах <code>.py</code>. Запуск: <code>python script.py</code> в терминале.</p>
<h3>print</h3>
<p>Функция <code>print()</code> выводит значения на экран — удобно для проверки результата.</p>`),
      task: 'Выведите через print слово Python (в кавычках).',
      hint: 'print("Python")',
      check: (c) => c.includes('print') && /python/i.test(c),
    },
    {
      title: 'Уровень 3: Интерактивный режим и IPython',
      theory: T(`<p>В <strong>интерактивном режиме</strong> (<code>python</code> или <code>python -i</code>) вы вводите выражения и сразу видите результат — удобно для экспериментов.</p>
<h3>IPython</h3>
<p><strong>IPython</strong> — «усиленная» консоль: подсветка, автодополнение, магические команды (<code>%time</code>, <code>?</code> для справки).</p>
<h3>REPL</h3>
<p>Read–Eval–Print Loop: читает ввод → вычисляет → печатает → повторяет.</p>`),
      task: 'Выведите print("ipython") — слово ipython в кавычках.',
      hint: 'print("ipython")',
      check: (c) => c.includes('print') && c.includes('ipython'),
    },
    {
      title: 'Уровень 4: Установка Python',
      theory: T(`<p>С официального сайта <strong>python.org</strong> скачивают установщик для Windows/macOS/Linux. Важно отметить <strong>Add Python to PATH</strong> (Windows).</p>
<h3>Версии</h3>
<p>Сейчас распространены ветки 3.x. Проверка версии в терминале: <code>python --version</code>.</p>
<h3>Окружения</h3>
<p>Позже полезно изучить <code>venv</code> — изолированные окружения для проектов.</p>`),
      task: 'Выведите print("version") — напоминание проверить версию Python командой python --version.',
      hint: 'print("version")',
      check: (c) => c.includes('print') && c.includes('version'),
    },
    {
      title: 'Уровень 5: Целые числа',
      theory: T(`<p>Тип <strong>int</strong> — целые числа произвольной точности (в разумных пределах памяти).</p>
<h3>Операции</h3>
<ul><li><code>+</code> <code>-</code> <code>*</code> — сложение, вычитание, умножение</li><li><code>//</code> — целочисленное деление</li><li><code>%</code> — остаток</li><li><code>**</code> — степень</li></ul>
<h3>Пример</h3><pre>print(10 + 5)
print(7 // 2)  # 3</pre>`),
      task: 'Выведите через print результат выражения 12 + 8 (можно как print(12 + 8)).',
      hint: 'print(12 + 8)',
      check: (c) => c.includes('print') && c.includes('12') && c.includes('8') && c.includes('+'),
    },
    {
      title: 'Уровень 6: Вещественные числа',
      theory: T(`<p>Тип <strong>float</strong> — числа с плавающей точкой. Литералы: <code>3.14</code>, <code>1e-3</code>.</p>
<h3>Осторожно</h3>
<p>Сравнивать float на равенство лучше с погрешностью или использовать <code>decimal.Decimal</code> для денег.</p>
<h3>int ↔ float</h3><pre>x = float("3.5")
y = int(3.9)  # 3</pre>`),
      task: 'Создайте переменную pi со значением 3.14 и выведите её через print.',
      hint: 'pi = 3.14\nprint(pi)',
      check: (c) => /\bpi\s*=\s*3\.14\b/.test(c) && c.includes('print'),
    },
    {
      title: 'Уровень 7: Типы данных',
      theory: T(`<p>У каждого значения есть тип. Основные встроенные: <code>int</code>, <code>float</code>, <code>bool</code>, <code>str</code>, <code>list</code>, <code>tuple</code>, <code>dict</code>, <code>set</code>.</p>
<h3>type()</h3>
<p><code>type(x)</code> возвращает класс объекта.</p>
<h3>Преобразования</h3><pre>str(10); int("42"); float("1.5")</pre>`),
      task: 'Вызовите print с выражением type(7) — увидите класс целого числа.',
      hint: 'print(type(7))',
      check: (c) => c.includes('type') && c.includes('7') && c.includes('print'),
    },
    {
      title: 'Уровень 8: Переменные и ввод/вывод',
      theory: T(`<p><strong>Переменная</strong> — имя, связанное с объектом. Присваивание: <code>name = value</code>.</p>
<h3>input()</h3>
<p><code>input("Подсказка: ")</code> читает строку с клавиатуры (в учебных задачах часто оборачивают в <code>int()</code>).</p>
<h3>print с несколькими аргументами</h3><pre>print("a", 2, sep="-")</pre>`),
      task: 'Создайте переменную name и присвойте ей строку "student" в кавычках, затем print(name).',
      hint: 'name = "student"\nprint(name)',
      check: (c) => c.includes('name') && c.includes('student') && c.includes('print'),
    },
    {
      title: 'Уровень 9: Логика и сравнения',
      theory: T(`<p>Логический тип <strong>bool</strong>: <code>True</code> и <code>False</code>.</p>
<h3>Операторы</h3>
<ul><li><code>and</code>, <code>or</code>, <code>not</code></li><li>Сравнения: <code>==</code> <code>!=</code> <code>&lt;</code> <code>&gt;</code> <code>&lt;=</code> <code>&gt;=</code></li></ul>
<h3>Цепочки</h3><pre>1 &lt; x &lt; 10  # допустимо в Python</pre>`),
      task: 'Выведите через print результат выражения: True and True (оба слова True латиницей).',
      hint: 'print(True and True)',
      check: (c) => c.includes('true') && c.includes('and') && c.includes('print'),
    },
    {
      title: 'Уровень 10: if, else, elif',
      theory: T(`<p><strong>Условия</strong> направляют поток программы. После <code>if</code>/<code>elif</code>/<code>else</code> обязателен двоеточие и <strong>блок с отступом</strong> (обычно 4 пробела).</p>
<h3>Пример</h3><pre>if x &gt; 0:
    print("plus")
else:
    print("not plus")</pre>`),
      task: 'Напишите if с условием x &gt; 0 (используйте символы x, &gt;, 0). Внутри тела только pass.',
      hint: 'if x > 0:\n    pass',
      check: (c) => c.includes('if') && c.includes('x') && c.includes('>') && c.includes('0') && c.includes('pass'),
    },
    {
      title: 'Уровень 11: Строки',
      theory: T(`<p>Строки <strong>str</strong> — неизменяемые последовательности символов. Кавычки: <code>'</code> или <code>"</code>, многострочные <code>"""</code>.</p>
<h3>Операции</h3>
<ul><li><code>+</code> и <code>*</code> для конкатенации и повторения</li><li><code>len(s)</code></li><li>Методы: <code>.lower()</code>, <code>.strip()</code>, <code>.split()</code></li></ul>`),
      task: 'Создайте переменную s со строкой "Python" в кавычках и вызовите print(s.lower()).',
      hint: 's = "Python"\nprint(s.lower())',
      check: (c) => c.includes('lower') && /python/i.test(c) && c.includes('print'),
    },
    {
      title: 'Уровень 12: Закрепление (строки и ветвления)',
      theory: T(`<p>Небольшой обзор: строки + <code>if</code> часто идут вместе (проверка ввода, форматирование).</p>
<h3>f-строки (Python 3.6+)</h3><pre>name = "Анна"
print(f"Привет, {name}!")</pre>`),
      task: 'Напишите цикл for i in range(2): с телом pass (две строки).',
      hint: 'for i in range(2):\n    pass',
      check: (c) => c.includes('for') && c.includes('range') && c.includes('2') && c.includes('pass'),
    },
    {
      title: 'Уровень 13: Цикл while',
      theory: T(`<p><strong>while условие:</strong> повторяет блок, пока условие истинно. Нужен способ изменить переменную, иначе — бесконечный цикл.</p>
<h3>Пример</h3><pre>n = 3
while n &gt; 0:
    print(n)
    n -= 1</pre>`),
      task: 'Напишите while с условием n &gt; 0: и телом pass.',
      hint: 'while n > 0:\n    pass',
      check: (c) => c.includes('while') && c.includes('n') && c.includes('>') && c.includes('0') && c.includes('pass'),
    },
    {
      title: 'Уровень 14: break и continue',
      theory: T(`<p><strong>break</strong> — выйти из цикла досрочно. <strong>continue</strong> — перейти к следующей итерации, пропустив остаток тела.</p>
<h3>else у цикла</h3>
<p>У <code>while</code>/<code>for</code> может быть <code>else</code>: выполнится, если цикл не прервали <code>break</code>.</p>`),
      task: 'Выведите два вызова print: в одном строка "break", в другом "continue" (слова в кавычках — для тренировки ключевых слов).',
      hint: 'print("break")\nprint("continue")',
      check: (c) => c.includes('break') && c.includes('continue') && c.includes('print'),
    },
    {
      title: 'Уровень 15: Цикл for',
      theory: T(`<p><strong>for элемент in последовательность:</strong> перебирает элементы. Часто используют <code>range(n)</code> — числа от 0 до n-1.</p>
<h3>range</h3><pre>range(5); range(2, 10, 2)</pre>`),
      task: 'Напишите for i in range(5): с телом pass.',
      hint: 'for i in range(5):\n    pass',
      check: (c) => c.includes('for') && c.includes('range') && c.includes('5') && c.includes('pass'),
    },
    {
      title: 'Уровень 16: Строки и символы',
      theory: T(`<p>Доступ по индексу: <code>s[0]</code> — первый символ, <code>s[-1]</code> — последний. Срезы: <code>s[1:4]</code>, <code>s[::2]</code>.</p>
<h3>Неизменяемость</h3>
<p>Строку «на месте» не меняют — создают новую.</p>`),
      task: 'Создайте s = "abc" и выведите print(s[0]) — первый символ.',
      hint: 's = "abc"\nprint(s[0])',
      check: (c) => c.includes('[0]') && c.includes('print') && (c.includes('"abc"') || c.includes("'abc'")),
    },
    {
      title: 'Уровень 17: Списки',
      theory: T(`<p><strong>list</strong> — изменяемая последовательность в квадратных скобках. Методы: <code>.append(x)</code>, <code>.pop()</code>, <code>.sort()</code>.</p>
<h3>Вложенность</h3>
<p>Элементами списка могут быть другие списки — «матрицы».</p>`),
      task: 'Создайте список nums = [1, 2] и вызовите nums.append(3). Упомяните append в коде.',
      hint: 'nums = [1, 2]\nnums.append(3)',
      check: (c) => c.includes('nums') && c.includes('append') && c.includes('['),
    },
    {
      title: 'Уровень 18: Закрепление (списки и циклы)',
      theory: T(`<p>Частый паттерн: создать пустой список и наполнить в цикле, или использовать списковое включение ( comprehensions ) позже.</p>`),
      task: 'Объявите пустой список: переменная box = [] и print(len(box)).',
      hint: 'box = []\nprint(len(box))',
      check: (c) => c.includes('box') && c.includes('[]') && c.includes('len') && c.includes('print'),
    },
    {
      title: 'Уровень 19: Функции def',
      theory: T(`<p><strong>def имя(параметры):</strong> определяет функцию. <code>return</code> возвращает значение. Параметры могут иметь значения по умолчанию.</p>
<h3>Области видимости</h3>
<p>Локальные имена внутри функции не видны снаружи (если не <code>global</code>/<code>nonlocal</code>).</p>`),
      task: 'Объявите def add(a, b): с телом return a + b',
      hint: 'def add(a, b):\n    return a + b',
      check: (c) => /def\s+add\s*\(\s*a\s*,\s*b\s*\)\s*:/.test(c) && c.includes('return') && c.includes('+'),
    },
    {
      title: 'Уровень 20: Словари dict',
      theory: T(`<p><strong>dict</strong> — пары ключ: значение. Ключи обычно неизменяемы (строки, числа, кортежи).</p>
<h3>Операции</h3><pre>d = {"a": 1}
d["b"] = 2
d.get("c", 0)</pre>`),
      task: 'Создайте словарь d с ключом "x" (строка) и значением 1: d = {"x": 1} или d = dict(x=1). Выведите print(d["x"]).',
      hint: 'd = {"x": 1}\nprint(d["x"])',
      check: (c) => c.includes('d') && c.includes('x') && c.includes('print') && (c.includes('{') || c.includes('dict')),
    },
    {
      title: 'Уровень 21: Запуск скрипта',
      theory: T(`<p>Модуль может работать и как библиотека, и как скрипт. Идиома:</p>
<pre>if __name__ == "__main__":
    main()</pre>
<p>Код внутри выполнится только при прямом запуске файла.</p>`),
      task: 'Напишите строку if __name__ == "__main__": (два подчёркивания с каждой стороны name и main).',
      hint: 'if __name__ == "__main__":',
      check: (c) => c.includes('__name__') && c.includes('__main__'),
    },
    {
      title: 'Уровень 22: Файловый ввод/вывод',
      theory: T(`<p>Работа с файлами через <code>open()</code> и контекстный менеджер <code>with</code> (гарантирует закрытие).</p>
<pre>with open("data.txt", "r", encoding="utf-8") as f:
    text = f.read()</pre>`),
      task: 'Напишите конструкцию with open("f.txt") as f: и следующей строкой pass',
      hint: 'with open("f.txt") as f:\n    pass',
      check: (c) =>
        c.includes('with') &&
        c.includes('open') &&
        c.includes('as') &&
        c.includes('pass') &&
        (c.includes('f.txt') || c.includes("f.txt")),
    },
    {
      title: 'Уровень 23: Модули import',
      theory: T(`<p><strong>import модуль</strong> подключает модуль; <code>from модуль import имя</code> — выборочно. Свои файлы в той же папке тоже импортируются как модули.</p>
<h3>if __name__</h3>
<p>Помогает избегать выполнения «лишнего» при импорте.</p>`),
      task: 'Напишите строку import math (встроенный модуль math).',
      hint: 'import math',
      check: (c) => c.includes('import') && c.includes('math'),
    },
    {
      title: 'Уровень 24: pip и пакеты',
      theory: T(`<p><strong>pip</strong> — установщик пакетов PyPI. Примеры: <code>pip install requests</code>, <code>pip list</code>, <code>pip freeze</code>.</p>
<h3>venv</h3>
<p>Сначала активируйте виртуальное окружение, затем ставьте пакеты — они не засорят систему.</p>`),
      task: 'Выведите print("pip") — слово pip в кавычках (напоминание про установщик пакетов).',
      hint: 'print("pip")',
      check: (c) => c.includes('pip') && c.includes('print'),
    },
    {
      title: 'Уровень 25: Закрепление перед NumPy',
      theory: T(`<p>Перед анализом данных убедитесь, что умеете импортировать модули и читать документацию. NumPy и Matplotlib ставятся через pip.</p>`),
      task: 'Импортируйте модуль os: строка import os',
      hint: 'import os',
      check: (c) => c.includes('import') && c.includes('os'),
    },
    {
      title: 'Уровень 26: NumPy',
      theory: T(`<p><strong>NumPy</strong> — массивы <code>ndarray</code>, быстрые векторные операции, линейная алгебра.</p>
<pre>import numpy as np
a = np.array([1, 2, 3])
print(a * 2)</pre>
<h3>Документация</h3>
<p>См. numpy.org — учебники и справка по API.</p>`),
      task: 'Напишите import numpy as np',
      hint: 'import numpy as np',
      check: (c) => c.includes('import') && c.includes('numpy') && c.includes('np'),
    },
    {
      title: 'Уровень 27: Matplotlib',
      theory: T(`<p><strong>Matplotlib</strong> — построение графиков. Часто используют:</p>
<pre>import matplotlib.pyplot as plt
plt.plot([1, 2, 3])
plt.show()</pre>`),
      task: 'Напишите import matplotlib.pyplot as plt',
      hint: 'import matplotlib.pyplot as plt',
      check: (c) => c.includes('import') && c.includes('matplotlib') && c.includes('pyplot') && c.includes('plt'),
    },
    {
      title: 'Уровень 28: Заключение',
      theory: T(`<p>Поздравляем с прохождением линейки тем! Дальше — проекты, чтение чужого кода, документация, алгоритмы и специализация (веб, данные, автоматизация).</p>
<h3>Что повторить</h3>
<ul><li>Синтаксис и стиль (PEP 8)</li><li>Структуры данных и стандартная библиотека</li><li>Тесты и отладка</li></ul>
<p>Нажмите «Проверить», чтобы завершить курс и получить сертификат на экране.</p>`),
      task: 'Выведите print("quest") — слово quest в кавычках, чтобы завершить квест.',
      hint: 'print("quest")',
      check: (c) => c.includes('print') && c.includes('quest'),
    },
  ];
})();
