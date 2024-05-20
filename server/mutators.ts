import { BaseMutators } from './BaseMutators';


export class Mutators extends BaseMutators {
    async deleteTransaction(id: number) {
        await this.prisma.transactions.delete({ where: { id } });
    }

    async createTransaction(data: {
        amount: number,
        description: string,
        category_id: number,
        date: number,
        type: string
    }) {
        await this.prisma.transactions.create({
            data
        })
    }
}