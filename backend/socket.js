import Poll from "./models/Poll.js";
import Student from "./models/Student.js";
import Response from "./models/Response.js";
import Message from "./models/Message.js";

const connectedStudents = {};

const activeStudents = async () => {
    const list = await Student.find({ isKicked: false });
    return list.map(s => s.name);
};

export default function socketHandler(socket, io) {

    socket.on("register-student", async ({ name }) => {
        socket.data.name = name;

        await Student.findOneAndUpdate(
            { socketId: socket.id },
            { name, isKicked: false },
            { upsert: true, new: true }
        );

        io.emit("participants:update", await activeStudents());
        socket.emit("registration:success");
    });

    socket.on("request-participants", async () => {
        socket.emit("participants:update", await activeStudents());
    });

    socket.on("chat:message", async ({ sender, text }) => {
        let name = null;

        const student = await Student.findOne({ socketId: socket.id });
        if (student && !student.isKicked) name = student.name;
        else if (sender === "Teacher") name = "Teacher";
        else return;

        const msg = await Message.create({
            sender: name,
            text,
            socketId: socket.id
        });

        io.emit("chat:message", {
            sender: msg.sender,
            text: msg.text,
            createdAt: msg.createdAt
        });
    });

    socket.on("get-all-messages", async () => {
        const msgs = await Message.find({}).sort({ createdAt: 1 });
        socket.emit("chat:messages", msgs);
    });

    socket.on("create-poll", async ({ text, options, timeLimit }) => {
        const poll = await Poll.create({ text, options, timeLimit });
        io.emit("poll-started", poll);
    });

    const canAskNext = async () => {
        const poll = await Poll.findOne().sort({ createdAt: -1 });
        if (!poll) return true;
        const answers = await Response.countDocuments({ pollId: poll._id });
        const students = await Student.countDocuments({ isKicked: false });
        return answers >= students;
    };

    socket.on("submit-answer", async ({ questionId, answer }) => {
        const student = await Student.findOne({ socketId: socket.id });
        if (!student) return;

        const poll = await Poll.findById(questionId);
        if (!poll) return;

        const opt = poll.options.id(answer);
        const correct = opt ? opt.isCorrect : false;

        await Response.create({
            studentId: student._id,
            pollId: questionId,
            selectedOption: answer,
            isCorrect: correct
        });

        const responses = await Response.find({ pollId: questionId });
        const tally = {};

        poll.options.forEach(o => tally[o._id] = 0);
        responses.forEach(r => {
            const id = r.selectedOption?.toString();
            if (id && tally[id] !== undefined) tally[id]++;
        });

        await canAskNext();
        io.emit("poll-results", { answers: tally });
    });

    socket.on("get-poll-history", async () => {
        const polls = await Poll.find().sort({ createdAt: -1 }).limit(10);
        const data = [];

        for (const poll of polls) {
            const responses = await Response.find({ pollId: poll._id });
            const res = {};

            poll.options.forEach(o => res[o._id] = 0);
            responses.forEach(r => {
                const id = r.selectedOption?.toString();
                if (id && res[id] !== undefined) res[id]++;
            });

            data.push({ poll, results: res });
        }

        socket.emit("poll-history", data);
    });

    socket.on("kick-student", async ({ name }) => {
        const student = await Student.findOneAndUpdate(
            { name },
            { isKicked: true }
        );

        if (!student) return;

        const target = [...io.sockets.sockets.values()]
            .find(s => s.data?.name === name);

        if (target) {
            target.emit("kicked");
            target.disconnect();
        }

        io.emit("participants:update", await activeStudents());
    });

    socket.on("disconnect", async () => {
        await Student.deleteOne({ socketId: socket.id });
        delete connectedStudents[socket.id];
        io.emit("participants:update", Object.values(connectedStudents));
    });
}
