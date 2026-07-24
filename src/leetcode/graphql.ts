


export const LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql/"






export const SUBMISSION_DETAILS_QUERY =  `
  query submissionDetails($submissionId: Int!) {
    submissionDetails(submissionId: $submissionId) {
      runtime
      runtimePercentile
      memory
      memoryPercentile
      code
      timestamp
      statusCode
      lang {
        name
        verboseName
      }
      question {
        questionId
        titleSlug
        title
        difficulty
        topicTags {
          name
        }
      }
      totalCorrect
      totalTestcases
    }
  }
`





export interface SubmissionDetailsResponse {
  data: {
    submissionDetails: {
      runtime: string | null
      runtimePercentile: number | null
      memory: string | null
      memoryPercentile: number | null
      code: string
      timestamp: number
      statusCode: number
      lang: {
        name: string       
        verboseName: string 
      }
      question: {
        questionId: string 
        titleSlug: string
        title: string
        difficulty: string 
        topicTags: { name: string }[]
      }
      totalCorrect: number
      totalTestcases: number
    } | null
  }
}






export async function leetcodeGraphQL<T>(
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const response = await fetch(LEETCODE_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      
      
      
      "x-csrftoken": getCsrfToken()
    },
    credentials: "include", 
    body: JSON.stringify({ query, variables })
  })

  if (!response.ok) {
    throw new Error(
      "LeetCode GraphQL HTTP error: " + response.status + " " + response.statusText
    )
  }

  const json = (await response.json()) as { data?: T; errors?: { message: string }[] }

  if (json.errors?.length) {
    throw new Error(
      "LeetCode GraphQL error: " + json.errors.map((e) => e.message).join("; ")
    )
  }

  if (!json.data) {
    throw new Error("LeetCode GraphQL returned no data")
  }

  return json.data
}






function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/)
  return match ? match[1] : ""
}
