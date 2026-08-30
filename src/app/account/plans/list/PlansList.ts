export interface PlansListType{
    plan: string
    header: string
    planName: string
    desc: string
    btnName: string
    planFunctions: string[]
}

export const PlansList:PlansListType[] = [
    {
    plan:'free',
    header: 'FOR INDIVIDUALS',
    planName: 'Free',
    desc: 'Basic writing suggestions, grammar checks, and tone detection.',
    btnName: 'Free Plan',
    planFunctions: ['1000 prompts', 'No paid upgrade required'],
    }
]