import Poll from "../models/Poll.js";
import Response from "../models/Response.js";

export const getPollHistory = async (req, res) => {
    try {
        const polls = await Poll.find().sort({ createdAt: -1 });
        const responses = await Response.find();

        const history = polls.map((poll) => {
            const pollResponses = responses.filter(
                (r) => r.pollId?.toString() === poll._id.toString()
            );

            const options = poll.options.map((option) => {
                const count = pollResponses.filter(
                    (r) => r.selectedOption?.toString() === option._id.toString()
                ).length;

                return {
                    _id: option._id,
                    text: option.text,
                    isCorrect: option.isCorrect,
                    count
                };
            });

            const totalVotes = options.reduce((a, b) => a + b.count, 0);

            return {
                _id: poll._id,
                question: poll.text,
                options: options.map((opt) => ({
                    ...opt,
                    percentage: totalVotes
                        ? Math.round((opt.count / totalVotes) * 100)
                        : 0
                })),
                createdAt: poll.createdAt
            };
        });

        res.json(history);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch poll history" });
    }
};
